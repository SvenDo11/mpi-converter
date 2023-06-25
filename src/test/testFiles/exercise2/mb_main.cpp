#include <mpi.h>
#include <iostream>
#include <string>
#include <vector>

#include "mb_worker.hpp"
#include "mb_server.hpp"
#include "print_ppm.hpp"

#ifndef BLOCKX
#define BLOCKX 4
#endif

#ifndef BLOCKY
#define BLOCKY 4
#endif

int main(int argc, char** argv)
{
	//default programm arguments
	std::string filename = "mandelbrot.ppm";
	double x_min=-2, x_max=2, y_min=-2, y_max=2;
	int width=400, heigth=400;
	int blockx = BLOCKX;
	int blocky = BLOCKY;

	if (argc == 2)
	{
		std::cout << "Usage: " << argv[1] << " <options>" << std::endl;
		std::cout << "Options can be:" << std::endl
			<< "-h      :Shows this guide." << std::endl
			<< "-o      :Set output filename. Has to be .ppm" << std::endl
			<< "-width  :Set output pixel width" << std::endl
			<< "-heigth :Set output pixel heigth" << std::endl
			<< "-xmin   :Set xmin" << std::endl
			<< "-xmax   :Set xmax" << std::endl
			<< "-ymin   :Set ymin" << std::endl
			<< "-ymax   :Set ymax" << std::endl
			<< "-block  :Set blockdim like 'MxN'" << std::endl;
		return 0;
	}

	if (argc == 3)
	{
		blockx = atoi(argv[1]);
		blocky = atoi(argv[2]);
	}

	//Init MPI
	MPI_Init(&argc, &argv);
	int rank;
	int comm_size;
	MPI_Comm_rank( MPI_COMM_WORLD, &rank);
	MPI_Comm_size( MPI_COMM_WORLD, &comm_size);

	//TODO: get parameters from arguments
	//	heigth = 40;
	//	width = 40;

	double step_size_x = (x_max - x_min) / width;
	double step_size_y = (y_max - y_min) / heigth;

	//If only one Process is available run hole picture
	if(comm_size == 1)
	{
		std::cout << "Running on 1 proc!" << std::endl;
		unsigned char *output = new unsigned char[width*heigth];
		mandelbrot(output, x_min, x_max, y_min, y_max, step_size_x, step_size_y);
		print_ppm(filename, output, width, heigth);
		delete[] output;

		MPI_Finalize();
		return 0;
	}

	// if this proc is master
	if(rank == MASTER)
	{
		mb_serve(comm_size, rank, filename, width, heigth, blockx, blocky);
		std::cout << "Master finished!" << std::endl;
	}
	// if this proc is a worker
	else
	{
		mb_work(comm_size, rank, x_min, x_max, y_min, y_max, blockx, blocky, step_size_x, step_size_y);
		std::cout << "Proc " << rank << " finished!" << std::endl;
	}

	MPI_Finalize();
	return 0;
}

#include "mb_worker.hpp"
#include <mpi.h>
#include <iostream>
#include <iomanip>
#include <complex>

unsigned int max_itter = 1000;

/**
 * Calculates if point(x,y) is in Mandelbrot set
 * @param x, real coordinat for point
 * @param y, imag coordinat for point
 * @return , 255 if (x,y) is in Mandelbrot set, else 0
 */
unsigned char is_in(double re, double im, unsigned int max_itter)
{
	unsigned int i = 0;
	std::complex<double> c(re,im);
	std::complex<double> z(0.0,0.0);

	//evaluate if c is in the Mandelbrot set.
	while(std::abs(z.real()) <= 2 && std::abs(z.imag()) <= 2)
	{
		z = z*z + c;
		if(++i >= max_itter)
		{
			return 255;
		}
	}
	return 1;

}
/**
 * Calculate mandelbrot for a given block
 */
void mandelbrot(unsigned char *mat_, double x_min, double x_max, double y_min, double y_max, double stepx, double stepy)
{
	unsigned int i,j;
	double re = x_min;
	double im = y_min;
	unsigned int width = std::round((x_max-x_min)/stepx);
	unsigned int heigth = std::round((y_max-y_min)/stepy);
	for(i = 0; i<heigth; ++i)
	{
		re = x_min;
		for(j = 0; j<width; ++j)
		{
			mat_[i*width + j]=is_in(re,im, max_itter);
			re += stepx;
		}
		im +=stepy;
	}
}

void mb_work(int comm_size, int rank , double x_min, double x_max, double y_min, double y_max ,int block_size_x, int block_size_y, double step_size_x, double step_size_y )
{
	int id = rank;
	MPI_Comm_rank(MPI_COMM_WORLD, &rank);
	int	block_size = block_size_x * block_size_y;
	int block_id[2] = {0,0};
	MPI_Status status;
	//unsigned char *block = new unsigned char[block_size];
	unsigned char block[block_size];

	std::cout << "Proc " << id << " starts work with:" << std::endl
		      << "block_size_x = " << block_size_x << std::endl
			  << "block_size_y = " << block_size_y << std::endl
			  << "step_size_x = " << step_size_x << std::endl
			  << "step_size_y = " << step_size_y << std::endl;

	//get inital data
	MPI_Recv(block_id, 2, MPI_INT, 0, INIT_TAG, MPI_COMM_WORLD, &status);
	std::cout << "Proc " << id << " recieved inital data!" << std::endl;
	while(block_id[0] != -1)
	{
		//calc block
		double x1 = x_min + block_id[0] * block_size_x * step_size_x;
		double y1 = y_min + block_id[1] * block_size_y * step_size_y;
		double x2 = x1 + block_size_x * step_size_x;
		double y2 = y1 + block_size_y * step_size_y;
		mandelbrot(block, x1, x2, y1, y2, step_size_x, step_size_y);
		//send block
		MPI_Send(block_id, 2, MPI_INT, MASTER, BLOCK_TAG, MPI_COMM_WORLD);
		MPI_Send(block, block_size, MPI_UNSIGNED_CHAR, MASTER, RETURN_TAG, MPI_COMM_WORLD);
		//get new block
		MPI_Recv(block_id, 2, MPI_INT, MASTER, BLOCK_TAG, MPI_COMM_WORLD, &status);
	}
}

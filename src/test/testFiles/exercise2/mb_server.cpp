#include "mb_server.hpp"
#include <mpi.h>
#include <cmath>
#include <iostream>
#include <string>

#include "print_ppm.hpp"
#include "mb_worker.hpp"

/**
 *
 */
inline void copy_block(unsigned char *picture, unsigned char *buffer, int blockx, int blocky, int x, int y, int width, int heigth)
{
	for (int i = 0; i < blocky; ++i)
	{
		//y= (y*blocky + 1) * width ||  x = x * blockx
		//exit loop if we are "below" target area (Overflow)
		if((y*blocky+i) >= heigth) break;
		int offset = y * blocky * width + i * width + x * blockx;
		int buffer_offset = std::min(blockx, width-(x*blockx));
		unsigned char *p = buffer + i*blockx;

		std::copy(p, p+buffer_offset, picture+offset);
	}
}

/**
 * Code to distribute blocks to other processes
 */
void mb_serve(int world_size, int world_rank, std::string filename, int width, int heigth, int blockx, int blocky)
{
	std::cout << "Master entering serve function with world_size = " << world_size
		      << ", world_rank = " << world_rank << ", width = " << width
			  << ", heigth = " << heigth << ", blockx = " << blockx
			  << ", blocky = " << blocky << std::endl;
	// initalise
	// picture size
	unsigned char *pic = new unsigned char[width*heigth];

	//block size
	int block_size = blockx * blocky;

	//block array;
	int numx = std::ceil(width/blockx);
	int numy = std::ceil(heigth/blocky);

	int next_block[2] = {0,0};
	int done[2] = {-1, -1};

	unsigned char *buf = new unsigned char[block_size];	
	int *return_block = new int[2];

	//MPI related variables
	MPI_Request req;
	MPI_Status status;
	
	//send first blocks
	for (int i = 1; i < world_size; ++i)
	{
		MPI_Isend(next_block, 2, MPI_INT, i, INIT_TAG, MPI_COMM_WORLD, &req);
		++next_block[0];
		if (next_block[0] >= numx)
		{
			++next_block[1];
			next_block[0] = 0;
		}
	}

	std::cout << "Inital block distribution done!" << std::endl;
	bool first_loop = true;
	// loop to distribute blocks
	for (next_block[1] = 0; next_block[1] < numy; next_block[1] += 1)
	{
		for (next_block[0] = 0; next_block[0] < numx; next_block[0] += 1)
		{
			if(first_loop)
			{
				next_block[0] = (world_size-1) % numx;
				first_loop = false;
			}
			// recv block
			MPI_Recv(return_block, 2, MPI_INT, MPI_ANY_SOURCE, BLOCK_TAG, MPI_COMM_WORLD, &status);
			unsigned int source = status.MPI_SOURCE;
			MPI_Recv(buf, block_size, MPI_UNSIGNED_CHAR, source, RETURN_TAG, MPI_COMM_WORLD, &status);
			// send proc new block data
			MPI_Isend(next_block, 2, MPI_INT, source, BLOCK_TAG, MPI_COMM_WORLD, &req);
			// save block
			copy_block(pic, buf, blockx, blocky, return_block[0], return_block[1], width, heigth);
		}
	}

	std::cout << "Finishing calculation!" << std::endl;
	// get last blocks
	for (int i = 1; i < world_size; ++i)
	{
		MPI_Recv(return_block, 2, MPI_INT, MPI_ANY_SOURCE, BLOCK_TAG, MPI_COMM_WORLD, &status);
		MPI_Recv(buf, block_size, MPI_UNSIGNED_CHAR, status.MPI_SOURCE, RETURN_TAG, MPI_COMM_WORLD, &status);
		MPI_Isend(done, 2, MPI_INT, status.MPI_SOURCE, BLOCK_TAG, MPI_COMM_WORLD, &req);
		int offset = return_block[1] * blockx + return_block[0];
		// save block
		std::copy(buf, buf+block_size, pic+offset);
	}

	std::cout << "Saving Picture!" << std::endl;
	// print to .ppm file
	print_ppm(filename, pic, width, heigth);

	delete[] pic;
	delete[] buf;
	delete[] return_block;
}

#include <mpi.h>
#include <stdio.h>
#include <cmath>
#include <typeinfo>

#define MASTERRANK 0
#define N 100

void doOtherStuf(int i)
{
}

int main(int argc, char **argv)
{
	MPI_Init(&argc, &argv);
	int world_size;
	MPI_Comm_size(MPI_COMM_WORLD, &world_size);

	// Get the rank of the process
	int world_rank;
	MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);

	if (world_rank == 0)
	{
		int buffer[100];
		MPI_Status status[10];
		MPI_Request request[10];
		for (int i = 0; i < 10; i++)
		{
			for (int j = 0; j < 10; j++)
			{
				buffer[i * 10 + j] = i * j + 2;
			}
			MPI_Isend(buffer + i * 10, 10, MPI_INT, 1, i, MPI_COMM_WORLD, &request[i]);
			doOtherStuf(i);
		}
		MPI_Waitall(10, request, status);
	}
	else
	{
		int buffer[100];
		MPI_Request request[10];
		for (int i = 0; i < 10; i++)
		{
			MPI_Irecv(buffer + i * 10, 10, MPI_INT, 0, i, MPI_COMM_WORLD, &request[i]);
		}
		int sum = 0;
		MPI_Waitall(10, request, MPI_STATUSES_IGNORE);
		for (int i = 0; i < 100; i++)
		{
			sum += buffer[i];
		}
		std::cout << "Sum: " << sum << std::endl;
	}

	// rank spezific code	// Finalize the MPI environment.
	MPI_Finalize();
}
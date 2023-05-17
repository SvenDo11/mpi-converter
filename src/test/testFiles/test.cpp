#include <mpi.h>
#include <stdio.h>
#include <cmath>
#include <typeinfo>

#define MASTERRANK 0
#define N 100

void doOtherStuf(int i){

}

int main(int argc, char** argv)
{
	MPI_Init(&argc, &argv);
	int world_size;
	MPI_Comm_size(MPI_COMM_WORLD, &world_size);

	// Get the rank of the process
	int world_rank;
	MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);

	// rank spezific code:
	if(world_rank == MASTERRANK)
	{
		int arr[N];
		for(int i = 0; i< N; i++)
		{
			arr[i] = i;
		}

		int cnt = floor(N/world_size);
		for(int i = 1; i < world_size; i++)
		{
			MPI_Send(arr + i*cnt, cnt, MPI_INT, i, 0, MPI_COMM_WORLD);
			doOtherStuf(i);
		}

		for(int i = 0; i < 100; i++)
		{
			doOtherStuf(i);
		}

		for(int i = 0; i < cnt; i++)
		{
			arr[i] = pow(i, 2);
		}

		for(int i = 0; i< cnt; i++)
		{
			std::cout << "ID: " << i << " has the value: " << arr[i]
				<< std::endl;
		}
	}
	else
	{
		int cnt = floor(N/world_size);
		int masterIDs[cnt];
		MPI_Status status;
		MPI_Recv(masterIDs, cnt, MPI_INT,
				MASTERRANK, 0, MPI_COMM_WORLD, &status);
		int pows[cnt];
		for(int i = 0; i<cnt; i++)
		{
			pows[i] = pow(i, 2);
		}

		for(int i = 0; i < cnt; i++)
		{
			std::cout << "ID: " << masterIDs[i] << " has the value: " << pows[i]
				<< std::endl;
		}
	}
	// Finalize the MPI environment.
	MPI_Finalize();
}

double other(int amount) {
	int i, j;
	int max = 100;
	const int masterID = 0;

	double buffer[1000];
	MPI_Status recv_stat;
	for(i = 0; (max > amount) ? amount : max  >= i; i++)
	{
		MPI_Recv(buffer + i * 10, 10, MPI_DOUBLE, masterID, 0, MPI_COMM_WORLD, &recv_stat);
	}

	doOtherStuf(max);

	double prod = 1;
	for(i = 0; i < max; i += 10)
	{
		for(j = i; j < i + 10; j++)
		{
			prod *= buffer[j];
		}
	}

	return prod;
}
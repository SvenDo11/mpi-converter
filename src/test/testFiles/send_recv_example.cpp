#include <mpi.h>
#include <iostream>
#include <cmath>
#include <cstdlib>

#define N 100000000
#define SEED 134895689
#define MAX_WORKER 1000

double foo(int value)
{
    return sqrt((double)value / 100.0);
}

void worker_work(int n_ranks, int rank, int n)
{
    MPI_Status status;
    int dist_size = ceil((double)n / (double)n_ranks);
    int values[dist_size];

    // Recv initial values from master
    MPI_Recv(values, dist_size, MPI_INT, n_ranks - 1, 0, MPI_COMM_WORLD, &status);

    // Calculate own buffer
    std::cout << "Worker " << rank << " starts working!" << std::endl;
    double total = 0;
    for (int i = 0; i < dist_size; i++)
    {
        total += foo(values[i]);
    }

    // Return result to master
    MPI_Send(&total, 1, MPI_DOUBLE, n_ranks - 1, 1, MPI_COMM_WORLD);

    std::cout << "Worker " << rank << " finished working!" << std::endl;
}

double master_work(int n_ranks, int n, int *values)
{
    double solutions[n_ranks - 1];

    // Distribute to other processes
    int dist_size = ceil((double)n / (double)n_ranks);
    for (int i = 0; i < n_ranks - 1; i++)
    {
        MPI_Send(values + dist_size * i, dist_size, MPI_INT, i, 0, MPI_COMM_WORLD);
    }

    for (int i = 0; i < (n_ranks - 1); i++)
    {
        MPI_Recv(solutions + i, 1, MPI_DOUBLE, i, 1, MPI_COMM_WORLD, MPI_STATUS_IGNORE);
    }
    // Process own buffer
    double total = 0;
    for (int i = dist_size * (n_ranks - 1); i < n; i++)
    {
        total += foo(values[i]);
    }

    for (int i = 0; i < n_ranks - 1; i++)
    {
        total += solutions[i];
    }
    std::cout << "Master finished working!" << std::endl;
    return total;
}

void verify(double value, int n, int *buffer)
{
    double ref_value = 0;
    for (int i = 0; i < n; i++)
    {
        ref_value += foo(buffer[i]);
    }

    if (std::abs(value - ref_value) < 0.0001)
    {
        std::cout << "MPI distributed algorithm found correct value: " << value << std::endl;
    }
    else
    {
        std::cout << "MPI distributed algorithm found value: " << value << ", but should be: " << ref_value << std::endl;
    }
}

int main(int argc, char **argv)
{
    MPI_Init(&argc, &argv);

    int world_size;
    MPI_Comm_size(MPI_COMM_WORLD, &world_size);

    if (world_size <= 1)
    {
        std::cout << "This Program need to be run with multiple processes, or it can not function correctly!" << std::endl;
        return 1;
    }

    int world_rank;
    MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);

    int n = N;
    if (world_rank == world_size - 1)
    {

        int buffer[n];
        std::srand(SEED);

        // Fill buffer
        for (int i = 0; i < n; i++)
        {
            buffer[i] = std::rand() % 100;
        }

        double result = master_work(world_size, n, buffer);

        verify(result, n, buffer);
    }
    else
    {
        worker_work(world_size, world_rank, n);
    }

    MPI_Finalize();
}
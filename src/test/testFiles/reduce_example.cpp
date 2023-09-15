#include <mpi.h>
#include <iostream>
#include <cmath>
#include <cstdlib>

#define N 100000
#define SEED 134895689
#define MAX_WORKER 1000

void verify(double value, int n, int *buffer);

double foo(int value)
{
    return sqrt((double)value / 100.0);
}

void all_work(int rank, int world_size)
{
    std::cout << "Rank " << rank << " starts working!" << std::endl;
    int n = N;
    int dist_size = ceil((double)n / (double)world_size);
    int buffer[n];
    int values[dist_size];
    if (rank == 0)
    {
        std::srand(SEED);

        // Fill buffer
        for (int i = 0; i < n; i++)
        {
            buffer[i] = std::rand() % 100;
        }
    }

    MPI_Scatter(buffer, dist_size, MPI_INT, values, dist_size, MPI_INT, 0, MPI_COMM_WORLD);
    // Process own buffer
    double total = 0;
    for (int i = 0; i < dist_size; i++)
    {
        total += foo(values[i]);
    }
    double solution;
    MPI_Reduce(&total, &solution, 1, MPI_DOUBLE, MPI_SUM, 0, MPI_COMM_WORLD);

    std::cout << "Rank " << rank << " finished working!" << std::endl;

    if (rank == 0)
    {
        verify(solution, n, buffer);
    }
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

    all_work(world_rank, world_size);

    MPI_Finalize();
}
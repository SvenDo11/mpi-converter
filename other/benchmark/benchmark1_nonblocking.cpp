#include <mpi.h>
#include <iostream>
#include <cmath>
#include <cstdlib>
#include <random>
#include <fstream>

// #define N 100000000
#define N 1000
#define SEED 134895689
#define MAX_WORKER 1000

double foo(double value, double *vals, int n_vals)
{
    double result = 0.0;
    for (int i = 0; i < n_vals; i++)
    {
        if (vals[i] == value)
        {
            result += vals[i];
        }
    }
    return result;
}

void worker_work(int n_ranks, int rank, int n, double *vals, int n_vals)
{
    MPI_Status status;
    int dist_size = ceil((double)n / (double)n_ranks);
    double *values = new double[dist_size];

    // Recv initial values from master
    MPI_Request req_recv;
    MPI_Irecv(values, dist_size, MPI_DOUBLE, n_ranks - 1, 0, MPI_COMM_WORLD, &req_recv);

    // Calculate own buffer
    std::cout << "Worker " << rank << " starts working!" << std::endl;
    double total = 0;
    MPI_Wait(&req_recv, &status);
    for (int i = 0; i < dist_size; i++)
    {
        total += foo(values[i], vals, n_vals);
    }

    // Return result to master
    MPI_Request req_send;
    MPI_Isend(&total, 1, MPI_DOUBLE, n_ranks - 1, 1, MPI_COMM_WORLD, &req_send);

    std::cout << "Worker " << rank << " finished working!" << std::endl;
    MPI_Wait(&req_send, MPI_STATUS_IGNORE);
}

double master_work(int n_ranks, int n, double *values, double *vals, int n_vals)
{
    double solutions[n_ranks - 1];

    // Distribute to other processes
    int dist_size = ceil((double)n / (double)n_ranks);
    MPI_Request req_send[n_ranks - 1];
    for (int i = 0; i < n_ranks - 1; i++)
    {
        MPI_Isend(values + dist_size * i, dist_size, MPI_DOUBLE, i, 0, MPI_COMM_WORLD, &req_send[i]);
    }

    // Get solution from worker. Note that exceeding MAX_WORKER should not result in issues and can therefor be ommited
    // (HINT): So this will allways terminate after n_ranks - 1 iterations
    MPI_Request req_recv[n_ranks - 1];
    for (int i = 0; i < ((n_ranks < MAX_WORKER) ? n_ranks - 1 : n_ranks); i++)
    {
        MPI_Irecv(solutions + i, 1, MPI_DOUBLE, i, 1, MPI_COMM_WORLD, &req_recv[i]);
    }
    // Process own buffer
    double total = 0;
    MPI_Waitall(n_ranks - 1, req_send, MPI_STATUS_IGNORE);
    for (int i = dist_size * (n_ranks - 1); i < n; i++)
    {
        total += foo(values[i], vals, n_vals);
    }
    MPI_Waitall(n_ranks - 1, req_recv, MPI_STATUSES_IGNORE);

    for (int i = 0; i < n_ranks - 1; i++)
    {
        total += solutions[i];
    }
    std::cout << "Master finished working!" << std::endl;
    return total;
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

    std::default_random_engine generator;
    std::uniform_real_distribution<double> dist(0, 25500);

    double *vals = new double[25500];
    for (int ii = 0; ii < 25500; ii++)
    {
        vals[ii] = dist(generator);
    }

    int n = N;
    MPI_Barrier(MPI_COMM_WORLD);
    double start_time = MPI_Wtime();
    if (world_rank == world_size - 1)
    {
        double *buffer = new double[n];

        // Fill buffer
        for (int i = 0; i < n; i++)
        {
            buffer[i] = dist(generator);
        }

        double result = master_work(world_size, n, buffer, vals, 25500);

        delete[] buffer;
    }
    else
    {
        worker_work(world_size, world_rank, n, vals, 25500);
    }
    MPI_Barrier(MPI_COMM_WORLD);
    double end_time = MPI_Wtime();

    if (world_rank == world_size - 1)
    {
        std::cout << "Elapsed time: " << (end_time - start_time) << std::endl;
        std::ofstream file;
        file.open("text.txt", std::ios::app);
        file << (end_time - start_time) << std::endl;
        file.close();
    }
    delete[] vals;
    MPI_Finalize();
}
#include <mpi.h>
#include <iostream>

int main(int argc, char **argv)
{
    MPI_Init(&argc, &argv);

    int world_size;
    MPI_Comm_size(MPI_COMM_WORLD, &world_size);

    // Get the rank of the process
    int world_rank;
    MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);

    int n = world_size;
    int m = 10;

    int buffer[m];
    if (world_rank == 0)
    {
        MPI_Request req;
        MPI_Psend_init(buffer, m, MPI_INT, 1, 0, MPI_COMM_WORLD, &req);
#pragma omp parallel for
        for (int j = 0; j < m; ++j)
        {
            buffer[j] = j;
            MPI_Pready(j, &req);
        }
        // MPI_Send(buffer, m, MPI_INT, 1, 0, MPI_COMM_WORLD);
        MPI_Wait(&req, MPI_STATUS_IGNORE);
    }
    else if (world_rank == 1)
    {
        MPI_Status status;
        MPI_Recv(buffer, m, MPI_INT, 0, 0, MPI_COMM_WORLD, &status);
        for (int i = 0; i < m; i++)
        {
            std::cout << buffer[i] << std::endl;
        }
    }
    else
    {
        /*
        MPI_Status status;
        MPI_Recv(buffer, m, MPI_INT, 0, 0, MPI_COMM_WORLD, &status);
        std::string out = "Worker " + std::to_string(world_rank) + " finds: ";
        for (int i = 0; i < m; i++)
        {
            out += std::to_string(buffer[i]) + ", ";
        }
        std::cout << out << std::endl;
        */
    }

    MPI_Finalize();
}
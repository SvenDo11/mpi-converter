#include <mpi.h>

int toFinalize(int argc, char **argv)
{
    MPI_Init(&argc, &argv);
    int world_size;
    MPI_Comm_size(MPI_COMM_WORLD, &world_size);

    // Get the rank of the process
    int world_rank;
    MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);

    int arr[] = {1, 2, 3, 4};
    MPI_Send(arr, 4, MPI_INT, 1, 0, MPI_COMM_WORLD);

    MPI_Finalize();
}

int toDomainEnd(int argc, char **argv)
{
    MPI_Init(&argc, &argv);
    int world_size;
    MPI_Comm_size(MPI_COMM_WORLD, &world_size);

    // Get the rank of the process
    int world_rank;
    MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);
    {
        int arr[] = {1, 2, 3, 4};
        MPI_Send(arr, 4, MPI_INT, 1, 0, MPI_COMM_WORLD);
    }
    MPI_Finalize();
}

int toConflict(int argc, char **argv)
{
    MPI_Init(&argc, &argv);
    int world_size;
    MPI_Comm_size(MPI_COMM_WORLD, &world_size);

    // Get the rank of the process
    int world_rank;
    MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);
    {
        int arr[] = {1, 2, 3, 4};
        MPI_Send(arr, 4, MPI_INT, 1, 0, MPI_COMM_WORLD);

        std::cout << "Something else" << std::endl;

        arr[2] = 6;
    }
    MPI_Finalize();
}

int toSubDomain(int argc, char **argv)
{
    MPI_Init(&argc, &argv);
    int world_size;
    MPI_Comm_size(MPI_COMM_WORLD, &world_size);

    // Get the rank of the process
    int world_rank;
    MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);
    {
        int arr[] = {1, 2, 3, 4};
        MPI_Send(arr, 4, MPI_INT, 1, 0, MPI_COMM_WORLD);

        std::cout << "Something else" << std::endl;

        for (int i = 1; i < 4; i++)
        {
            arr[i] = arr[i - 1] + 1;
        }
    }
    MPI_Finalize();
}
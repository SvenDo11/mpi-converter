
#include <mpi.h>
#include <iostream>

#include "mandelbrot.hpp"
#include "verify.hpp"
#include "print_ppm.hpp"

void master(int size, unsigned char *mb_mat, int width, int heigth)
{
    int x = 0;
    int worker_active = 0;
    for (int i = 1; i < size; ++i)
    {
        MPI_Send(&x, 1, MPI_INT, i, 0, MPI_COMM_WORLD);
        x += 1;
        worker_active += 1;
    }

    unsigned char *row = (unsigned char *)malloc(sizeof(unsigned char) * heigth);
    while (worker_active > 0)
    {
        int ret_x = 0;
        MPI_Status stat_x, stat_row;
        MPI_Recv(&ret_x, 1, MPI_INT, MPI_ANY_SOURCE, 1, MPI_COMM_WORLD, &stat_x);
        MPI_Recv(row, heigth, MPI_UNSIGNED_CHAR, stat_x.MPI_SOURCE, 2, MPI_COMM_WORLD, &stat_row);
        if (x < width)
        {
            MPI_Send(&x, 1, MPI_INT, stat_x.MPI_SOURCE, 0, MPI_COMM_WORLD);
            x += 1;
        }
        else
        {
            MPI_Send(&x, 1, MPI_INT, stat_x.MPI_SOURCE, 3, MPI_COMM_WORLD);
            worker_active -= 1;
        }

        for (int i = 0; i < heigth; ++i)
        {
            mb_mat[ret_x + heigth * i] = row[i];
        }
    }
    free(row);
}

void worker(double x_min, double step_size_x, int heigth, double y_min, double y_max, double step_size_y)
{

    int x = 0;
    // unsigned char *row = new unsigned char[heigth];
    unsigned char *row = (unsigned char *)malloc(sizeof(unsigned char) * heigth);
    int last_tag = 0;
    while (last_tag == 0)
    {
        MPI_Status stat;
        MPI_Recv(&x, 1, MPI_INT, 0, MPI_ANY_TAG, MPI_COMM_WORLD, &stat);
        if (stat.MPI_TAG == 3)
        {
            break;
        }
        double im = x * step_size_x + x_min;
        mandelbrot(row, im, y_min, y_max, heigth, step_size_y);
        MPI_Send(&x, 1, MPI_INT, 0, 1, MPI_COMM_WORLD);
        MPI_Send(row, heigth, MPI_UNSIGNED_CHAR, 0, 2, MPI_COMM_WORLD);
        last_tag = stat.MPI_TAG;
    }
    free(row);
    return;
}

int main(int argc, char **argv)
{
    MPI_Init(&argc, &argv);

    int world_size;
    MPI_Comm_size(MPI_COMM_WORLD, &world_size);

    int world_rank;
    MPI_Comm_rank(MPI_COMM_WORLD, &world_rank);

    double x_min = -2, x_max = 0.5, y_min = -1.2, y_max = 1.2;
    int width = 400, heigth = 400;
    double step_size_x = (x_max - x_min) / (double)width;
    double step_size_y = (y_max - y_min) / (double)heigth;

    if (world_rank == 0)
    {
        unsigned char *mb_mat = (unsigned char *)malloc(sizeof(unsigned char) * (width * heigth));
        master(world_size, mb_mat, width, heigth);

        std::cout << "Verifying..." << std::endl;
        bool correct = verify_mandelbrot(mb_mat, x_min, x_max, y_min, y_max, width, heigth);
        if (correct)
        {
            std::cout << "The distributed mandelbrot set is correct." << std::endl;
        }
        else
        {
            std::cout << "The distributed mandelbrot set has an error." << std::endl;
        }
        print_ppm("mandelbrot.ppm", mb_mat, width, heigth);
        free(mb_mat);
    }
    else
    {
        std::cout << "Worker " << world_rank << " started working" << std::endl;
        worker(x_min, step_size_x, heigth, y_min, y_max, step_size_y);
        std::cout << "Worker " << world_rank << " finished working" << std::endl;
    }

    MPI_Finalize();

    return 0;
}

#include <mpi.h>
#include <iostream>
#include <complex>

#include "print_ppm.hpp"

const unsigned int max_itter = 1000;

/**
 * Calculates if point(x,y) is in Mandelbrot set
 * @param x, real coordinat for point
 * @param y, imag coordinat for point
 * @return , 255 if (x,y) is in Mandelbrot set, else 0
 */
unsigned char is_in(double re, double im, unsigned int max_itter)
{
    unsigned int i = 0;
    std::complex<double> c(re, im);
    std::complex<double> z(0.0, 0.0);

    // evaluate if c is in the Mandelbrot set.
    while (std::abs(z.real()) <= 2 && std::abs(z.imag()) <= 2)
    {
        z = z * z + c;
        if (++i >= max_itter)
        {
            return 255;
        }
    }
    return 1;
}
/**
 * Calculate mandelbrot for a given block
 */
void mandelbrot(unsigned char *mat_, double x, double y_min, double y_max, int height, double stepy)
{
    double re = x;
    double im = y_min;
    for (int i = 0; i < height; ++i)
    {
        mat_[i] = is_in(re, im, max_itter);
        im += stepy;
    }
}

void master(int size)
{
    double x_min = -2, x_max = 2, y_min = -2, y_max = 2;
    int width = 400, heigth = 400;
    double step_size_x = (x_max - x_min) / (double)width;
    double step_size_y = (y_max - y_min) / (double)heigth;

    int x = 0;
    int worker_active = 0;
    for (int i = 1; i < size; ++i)
    {
        MPI_Send(&x, 1, MPI_INT, i, 0, MPI_COMM_WORLD);
        std::cout << "sending to: " << i << std::endl;
        x += 1;
        worker_active += 1;
    }

    unsigned char *mb_mat = new unsigned char[width * heigth];
    unsigned char *row = new unsigned char[heigth];
    while (worker_active > 0)
    {
        int ret_x;
        MPI_Status stat_x, stat_row;
        MPI_Recv(&ret_x, 1, MPI_INT, MPI_ANY_SOURCE, 1, MPI_COMM_WORLD, &stat_x);
        std::cout << "Recieving: " << ret_x << std::endl;
        MPI_Recv(row, heigth, MPI_UNSIGNED_CHAR, stat_x.MPI_SOURCE, 2, MPI_COMM_WORLD, &stat_row);
        if (x < width)
        {
            MPI_Send(&x, 1, MPI_INT, stat_x.MPI_SOURCE, 0, MPI_COMM_WORLD);
            std::cout << "sending to: " << stat_x.MPI_SOURCE << std::endl;
            x += 1;
        }
        else
        {
            MPI_Send(&x, 1, MPI_INT, stat_x.MPI_SOURCE, 3, MPI_COMM_WORLD);
            std::cout << "sending DONE to: " << stat_x.MPI_SOURCE << std::endl;
            worker_active -= 1;
        }

        for (int i = 0; i < heigth; ++i)
        {
            std::cout << "writing to " << ret_x * width + i << std::endl;
            mb_mat[ret_x * heigth + i] = row[i];
        }
    }
    std::cout << "Done" << std::endl;
    print_ppm("mandelbrot.ppm", mb_mat, width, heigth);
    delete[] mb_mat;
    delete[] row;
}

void worker()
{
    double x_min = -2, x_max = 2, y_min = -2, y_max = 2;
    int width = 400, heigth = 400;
    double step_size_x = (x_max - x_min) / (double)width;
    double step_size_y = (y_max - y_min) / (double)heigth;

    int x;
    unsigned char *row = new unsigned char[heigth];
    int last_tag = 0;
    while (last_tag == 0)
    {
        MPI_Status stat;
        MPI_Recv(&x, 1, MPI_INT, 0, MPI_ANY_TAG, MPI_COMM_WORLD, &stat);
        std::cout << "Receiving x = " << x << std::endl;
        if (stat.MPI_TAG == 3)
        {
            std::cout << "Done" << std::endl;
            break;
        }
        double im = x * step_size_x + x_min;
        mandelbrot(row, x, y_min, y_max, heigth, step_size_y);
        MPI_Send(&x, 1, MPI_INT, 0, 1, MPI_COMM_WORLD);
        std::cout << "Sending x = " << x << std::endl;
        MPI_Send(row, heigth, MPI_UNSIGNED_CHAR, 0, 2, MPI_COMM_WORLD);
        last_tag = stat.MPI_TAG;
    }
    delete[] row;
    return;
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
        master(world_size);
    }
    else
    {
        worker();
    }

    MPI_Finalize();

    return 0;
}
#include "verify.hpp"

#include <iostream>
#include <cmath>
#include "mandelbrot.hpp"

bool verify_mandelbrot(unsigned char *mb_set, double x_min, double x_max, double y_min, double y_max, int width, int heigth)
{
    double step_size_x = (x_max - x_min) / (double)width;
    double step_size_y = (y_max - y_min) / (double)heigth;

    int error_threshold = std::round((double)width * (double)heigth / 0.001);

    int wrong_pixxel = 0;
    for (int i = 0; i < heigth; ++i)
    {
        for (int j = 0; j < width; j++)
        {
            double re = x_min + j * step_size_x;
            double im = y_min + i * step_size_y;

            if (mb_set[i * width + j] != is_in(re, im, max_itter))
            {
                wrong_pixxel++;
            }
        }
    }
    return wrong_pixxel <= error_threshold;
}
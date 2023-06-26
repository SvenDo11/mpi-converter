#include "mandelbrot.hpp"

#include <complex>

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
        if (im > y_max)
        {
            break;
        }
        mat_[i] = is_in(re, im, max_itter);
        im += stepy;
    }
}
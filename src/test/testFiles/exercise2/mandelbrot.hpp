#ifndef MANDELBROT_HPP_
#define MANDELBROT_HPP_

const unsigned int max_itter = 1000;

/**
 * Calculates if point(x,y) is in Mandelbrot set
 * @param x, real coordinat for point
 * @param y, imag coordinat for point
 * @return , 255 if (x,y) is in Mandelbrot set, else 0
 */
unsigned char is_in(double re, double im, unsigned int max_itter);

/**
 * Calculate mandelbrot for a given block
 */
void mandelbrot(unsigned char *mat_, double x, double y_min, double y_max, int height, double stepy);

#endif
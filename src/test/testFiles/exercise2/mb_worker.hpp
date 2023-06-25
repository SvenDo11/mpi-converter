#ifndef MB_WORKER_HPP_
#define MB_WORKER_HPP_

//define comm tags
#define INIT_TAG 1
#define BLOCK_TAG 2
#define RETURN_TAG 3

#define MASTER 0

/**
 * Calculates Mandelbrot for given block.
 * @param mat_: buffer to write mandelbrot set to. Hast to have at least a size of (x_max-x_min)/stepx * (y_max-y_min)/stepy 
 * @param x_min: lowest real value.
 * @param x_max: highest real value.
 * @param y_min: lowest imaginary value.
 * @param y_max: highest imaginary value.
 * @param stepx: step size in real direction.
 * @param stepy: step size in imaginary direction
 */
void mandelbrot(unsigned char *mat_, double x_min, double x_max, double y_min, double y_max, double stepx, double stepy);

void mb_work(int comm_size, int rank , double x_min, double x_max, double y_min, double y_max ,int block_size_x, int block_size_y, double step_size_x, double step_size_y);

#endif //MB_WORKER_HPP_

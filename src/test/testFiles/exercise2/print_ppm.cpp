#include <fstream>

void print_ppm(std::string filename, unsigned char *picture, unsigned int width, unsigned int heigth)
{
	std::ofstream output;
	output.open(filename, std::ofstream::out);
	// print header
	output << "P2\n"
		   << width << " " << heigth << "\n"
		   << "255\n";

	// print picture
	for (unsigned int i = 0; i < heigth; ++i)
	{
		unsigned int line_length = 0;
		for (unsigned int j = 0; j < width; ++j)
		{
			if (line_length >= 70)
			{
				output << "\n";
				line_length = 0;
			}
			output.width(4);
			output << (int)picture[i * width + j];
			line_length += 2;
		}
		output << "\n";
	}
	output.close();
}

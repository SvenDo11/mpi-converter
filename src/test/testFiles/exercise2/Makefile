CXX=		mpic++
CFLAGS=		-g -Wall -Wextra 
# LDFLAGS= 	-I /usr/lib/x86_64-linux-gnu/openmpi/include -I /usr/lib/x86_64-linux-gnu/openmpi/lib/

ifeq ($(OS),Windows_NT)     # is Windows_NT on XP, 2000, 7, Vista, 10...
	TARGETEXTENSION= exe
else
	TARGETEXTENSION= out
endif

TARGET=		mandelbrot


all: mandelbrot

.PHONY: all clean run

mandelbrot: mandelbrot.o exercise2.o verify.o print_ppm.o
	$(CXX) -o $(TARGET).$(TARGETEXTENSION) $^ $(CFLAGS) $(LDFLAGS)

%.o : %.cpp
	$(CXX) -c $(CFLAGS) $(LDFLAGS) $< -o $@ 

clean:
	rm -rvf *.o $(TARGET).$(TARGETEXTENSION)

run:
	mpirun $(TARGET).$(TARGETEXTENSION)
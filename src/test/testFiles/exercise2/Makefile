CXX=		mpic++
CFLAGS=		-g -Wall -Wextra 
LDFLAGS= 	-I /usr/lib/x86_64-linux-gnu/openmpi/include -I /usr/lib/x86_64-linux-gnu/openmpi/lib/
TARGET=		mandelbrot

BLOCKX = 4
BLOCKY = 4

all: mandelbrot

.PHONY: all clean

mandelbrot: mb_main.o mb_server.o mb_worker.o print_ppm.o
	$(CXX) -o $@ $^ $(CFLAGS) $(LDFLAGS)

%.o : %.cpp
	$(CXX) -c $(CFLAGS) $(LDFLAGS) $< -o $@ -DBLOCKX=$(BLOCKX) -DBLOCKY=$(BLOCKY)

clean:
	rm -rvf *.o $(TARGET)

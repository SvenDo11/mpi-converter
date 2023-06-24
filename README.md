# mpiconv README

This is the README of the [Visual Studio Code](code.visualstudion.com) extension _mpiconv_.

## Features

This extension can provide a dialog driven algorithm, that replaces the blocking send and recv MPI statements with the more modern unblocking Isend and Irecv.

## Requirements

-   [Visual Studio Code](https://code.visualstudio.com/)
-   [Nodejs](https://nodejs.org/)
-   [Yeoman](https://yeoman.io/)

## Instalation

Make sure you have [Nodejs](https://nodejs.org/) installed on your system.
Install [Yeoman](https://yeoman.io/) and the Visual Studio Code Api, by running the following comand:

```
    npm install -g yo generator-code
```

Afterwards, run the following command within this repositories folder:

```
    npm install
```

This will install all the required Nodejs packages.

# Extension Settings

| _Setting_ | _Description_ |
| Confirmationstrings | An array of strings that can be used to confirm in a yes/no dialog. |
| Decliningstrings | An array of strings that can be used to decline in a yes/no dialog. |
| FunctionDataRace | Choose what to do when an unknown function may be in conflict with the current Operation. |

## Release Notes

### 0.0.1

First full version with the blocking to unblocking toolset.

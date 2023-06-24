# Anleitung zur Nutzerstudie für die Masterarbeit "Ein IDE Plugin für Automatische MPI Code Modernisierung"

## Foraussetzungen
Sie benötigen die folgenden Programme zur Teilnahme an der Umfrage:
- [Visual Studio Code](https://code.visualstudio.com/)
- Ein C++ Kompiler, zum beispiel [gcc](https://gcc.gnu.org/)
- Eine MPI Library, zum beispiel [OpenMPI](https://www.open-mpi.org/)

### Installieren:

#### Windows

1. Laden Sie Visual Studio Code von [hier](https://code.visualstudio.com/Download) herunter und installiern Sie es.
2. Installieren Sie einen C++ Kompiler und eine MPI Library. Wenn Sie bereits einen C++ Kompiler mit MPI haben, machen Sie mit schritt [3] weiter.
Ansonsten Empfehlen wir, [Windows Subsystem for Linux](https://learn.microsoft.com/en-us/windows/wsl/about) zu nutzen.
Führen sie dafür folgende Schritte aus:
    1. Öffnen Sie die Windows PowerShell als Administrator.

    ![](media/powershell_admin.png){width=30%}
    
    2. Führen Sie den befehl `wsl --install` aus.
    3. Warten Sie etwas, bis sie nach einem Nutzernamen gefragt werden.
    4. Geben Sie ein Nutzernahmen und ein Passwort an. Diese dienen als Account für das Linux subsystem.
    5. Rebooten Sie ihren Computer
    6. Ein Fenster mit dem Titel Ubuntu sollte sich nach dem Login automatisch öffnen und den Installationsprozess fortsetzen.
    7. Nachdem Ubuntu fertig installiert ist, kann mit den folgenden Befehlen gcc und openMPI installiert werden.

        `sudo apt-get update`

        `sudo apt-get install gcc make openmpi-bin`

    8. Bestätigen Sie mit 'y'
3. Installieren Sie das Plugin in Visual Studio Code:
    1. Öffnen Sie Visual Studio Code und navigieren Sie in der Aktivitätenleiste auf der linken seite zu den Erweiterungen (eng. Extensions).
    2. Clicken Sie in dem Extension Tab auf ...
    3. Wählen Sie "Aus VSIX installieren"/ "Install from VSIX"

![](media/vsix.png){width = 30%}

#### Linux

1. Laden Sie Visual Studio Code von [hier](https://code.visualstudio.com/Download) herunter und installiern Sie es. Alternativ can Visual Studio Code auch von manchen package managern installiert werden.
2. Wenn Sie noch keinen C++ Kompiler, MPI Library oder Make installiert haben, nutzen Sie ihren package manager um 'gcc', 'make' und 'openmpi' zu installieren.
    - Ubuntu/Debian:    `sudo apt-get install gcc make openmpi-bin`
    - Arch:             `sudo pacman -S gcc make openmpi`
3. Installieren Sie das Plugin in Visual Studio Code:
    1. Öffnen Sie Visual Studio Code und navigieren Sie in der Aktivitätenleiste auf der linken seite zu den Erweiterungen (eng. Extensions).
    2. Clicken Sie in dem Extension Tab auf ...
    3. Wählen Sie "Aus VSIX installieren"/ "Install from VSIX"

![](media/vsix.png){width = 30%}

## Durchführung
1. 

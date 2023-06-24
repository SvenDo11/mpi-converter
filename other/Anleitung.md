# Anleitung zur Nutzerstudie für die Masterarbeit "Ein IDE Plugin für Automatische MPI Code Modernisierung"

## 1. Voraussetzungen

Sie benötigen die folgenden Programme zur Teilnahme an der Umfrage:

-   [Visual Studio Code](https://code.visualstudio.com/)
-   Ein C++ Compiler, zum Beispiel [gcc](https://gcc.gnu.org/)
-   Eine MPI Library, zum Beispiel [OpenMPI](https://www.open-mpi.org/)

### Installieren:

#### Windows

1.  Laden Sie Visual Studio Code von [hier](https://code.visualstudio.com/Download) herunter und installieren Sie es.
2.  Installieren Sie einen C++ Compiler und eine MPI Library. Wenn Sie bereits einen C++ Compiler mit MPI haben, machen Sie mit schritt [3] weiter.
    Ansonsten empfehlen wir, [Windows Subsystem for Linux](https://learn.microsoft.com/en-us/windows/wsl/about) zu nutzen.
    Führen Sie dafür folgende Schritte aus:

    1. Öffnen Sie die Windows PowerShell als Administrator.

    ![](media/powershell_admin.png){width=30%}

    2. Führen Sie den Befehl `wsl --install` aus.
    3. Warten Sie etwas, bis Sie nach einem Nutzernamen gefragt werden.
    4. Geben Sie ein Nutzernamen und ein Passwort an. Diese dienen als Account für das Linux Subsystem.
    5. Rebooten Sie ihren Computer
    6. Ein Fenster mit dem Titel Ubuntu sollte sich nach dem Login automatisch öffnen und den Installationsprozess fortsetzen.
    7. Nachdem Ubuntu fertig installiert ist, kann mit den folgenden Befehlen gcc und openMPI installiert werden.

        `sudo apt-get update`

        `sudo apt-get install gcc make openmpi-bin`

    8. Bestätigen Sie mit 'y'
    9. Sie haben nun ein Ubuntu terminal und können dort wie mit einem Linux System arbeiten. Das System kann auch durch die PowerShell mit dem Befehl `wsl` aufgerufen werden. Dies können sie im Visual Studio Code Terminal machen, um dort dann die `make` Befehle in der Durchführung auszuführen.
       Mit `exit` wechseln Sie wieder in die gewohnte PowerShell zurück.

3.  Installieren Sie das Plugin in Visual Studio Code:

    1. Öffnen Sie Visual Studio Code und navigieren Sie in der Aktivitätenleiste auf der linken Seite zu den Erweiterungen (eng. Extensions).
    2. Klicken Sie in dem Extension Tab auf ...
    3. Wählen Sie _Aus VSIX installieren_ / _Install from VSIX_

    ![](media/vsix.png){width = 30%}

    4. Wählen Sie in dem Fileselektor die bereitgestellte _mpiconv-0.0.X.vsix_ Datei aus.

#### Linux

1. Laden Sie Visual Studio Code von [hier](https://code.visualstudio.com/Download) herunter und installieren Sie es. Alternativ kann Visual Studio Code auch von manchen package managern installiert werden.
2. Wenn Sie noch keinen C++ Kompiler, MPI Library oder Make installiert haben, nutzen Sie Ihren package manager, um 'gcc', 'make' und 'openmpi' zu installieren.
    - Ubuntu/Debian: `sudo apt-get install gcc make openmpi-bin`
    - Arch: `sudo pacman -S gcc make openmpi`
3. Installieren Sie das Plugin in Visual Studio Code:

    1. Öffnen Sie Visual Studio Code und navigieren Sie in der Aktivitätenleiste auf der linken Seite zu den _Erweiterungen_ (eng. _Extensions_).
    2. Klicken Sie in dem Extension Tab auf ...
    3. Wählen Sie _Aus VSIX installieren_ / _Install from VSIX_

    ![](media/vsix.png){width = 30%}

    4. Wählen Sie in dem Fileselektor die bereitgestellte _mpiconv-0.0.X.vsix_ Datei aus.

## 2. Durchführung

1. Öffnen Sie den bereitgestellten Ordner _exercise1_ in Visual Studio Code.
2. Öffnen Sie die Datei _exercise1.cpp_.
3. Machen Sie sich etwas mit dem Code vertraut. Das Programm wendet die Funktion _function_ auf jedes Element eines Arrays an und berechnet dann die Summe aller Elemente.
   Dafür wird einer der Prozesse als Master und die anderen als Worker benutzt.
   Der Master generiert zunächst ein Array und ruft dann die Funktion _master_work_ auf.
   Dort verteilt er das Array gleichmäßig auf die Worker mit _MPI_Send_.
   Dann empfängt er die Subergebnisse mit _MPI_Recv_.
   Zum Schluss berechnet er noch den Rest des Arrays und summiert alle Subergebnisse auf.
   Die Worker rufen direkt die Funktion _worker_work_ auf.
   Dort empfangen Sie ihren Teil des Arrays und berechnen ihr Subergebnis.
   Sie geben ihre Subergebnisse an den Master zurück und sind fertig.
   Das verteilte Ergebnis wird dann noch mit der Funktion _verfiy_ geprüft.
   Ob das Ergebnis richtig ist, oder nicht wird auf der Kommandozeile ausgegeben.
4. Testen Sie das Programm, indem Sie folgende befehle im Terminal eingeben:

    `make all`

    `make test`

5. Wenden Sie nun das Plugin an, indem Sie entweder links auf das MPI Symbol klicken und dann den grünen Pfeil anklicken, oder mit der Tastenkombination "_ctr_ + _shift_ + _p_" das Ausführfenster öffnen und "Convert MPI Statements" ausführen.

    ![](media/run_plugin.png)

6. Das Plugin wird ihnen nun eine Reihe an Fragen mit dem Dialogfenster stellen. Versuchen Sie jede der 4 MPI send/recv Instruktionen mit dem Plugin zu ersetzen.

7. Testen Sie das Resultat mit den Befehlen:

    `make all`

    `make test`

8. Sollte das Programm nicht direkt Kompilieren, oder das falsche Ergebnis ausrechnen, versuchen Sie die Fehler bitte manuell zu beheben.

9. Wenn Sie alle Instruktionen ersetzt haben und das Programm das richtige Ergebnis ausgibt, oder wenn Sie es nicht schaffen, das Programm nach dem Anwenden des Plugins zum Laufen zu bringen, öffnen Sie bitte den Fragebogen und füllen ihn aus.

Vielen Dank, dass Sie sich die Zeit genommen haben.
Ihre Angaben und ihr Feedback tragen maßgeblich zu meiner Masterarbeit bei.

Bei Fragen oder Problemen wenden Sie sich gerne an mich: sven.donnerhak@stud.tu-darmstadt.de

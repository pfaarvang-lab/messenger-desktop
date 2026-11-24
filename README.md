# Messenger Desktop til Mac

Selvstændig Messenger-app til macOS (Electron), som den gamle Messenger-desktopapp.
Uofficiel – ikke tilknyttet Meta.

## Download
Hent nyeste `.dmg` under **[Releases](../../releases/latest)** og følg `Installationsvejledning.txt`.
Virker på M-chip og Intel, macOS 13+.

## Funktioner
- Egen app i Dock med badge for ulæste beskeder
- Native macOS-notifikationer – også når vinduet er lukket (skjult)
- Husker login og vinduesstørrelse
- Giver besked når der er en ny version

## Opdateringer
En GitHub Action tjekker hver mandag om Electron har en ny version. Hvis ja, bygges
og udgives en ny version automatisk, og appen giver brugerne besked.

## Byg selv
```bash
./build-dmg.sh      # eller dobbeltklik "Opdater Messenger.command" for at bygge + installere
```

# Thissen postcodecalculator op GitHub Pages

De map `public` bevat een volledig statische website. Er is geen server, database of buildstap nodig.

## Publiceren

1. Plaats de inhoud van `public` in de hoofdmap van een GitHub-repository.
2. Open in GitHub **Settings → Pages**.
3. Kies **Deploy from a branch**.
4. Selecteer de gewenste branch, meestal `main`, en map `/ (root)`.
5. Bewaar de instelling. GitHub toont daarna de Pages-URL.

De toegangscode is ingesteld op `1898`. De browser onthoudt een correcte invoer alleen voor de huidige browsersessie.

## Belangrijk

De toegangscode wordt volledig in de browser gecontroleerd. Ze voorkomt toevallige toegang, maar is geen volwaardige beveiliging: iemand met toegang tot de publieke bronbestanden kan de controle omzeilen. Gebruik voor gevoelige informatie een private repository met een hostingoplossing die server-side authenticatie ondersteunt.

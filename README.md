# Toscana Diagnostica · Finance

Webapp dell'Area Finance per gli step autorizzativi in forma digitale. Prima funzionalità: autorizzazione al pagamento con firma congiunta CEO e CFO, replica del modulo "Autorizzazione congiunta al pagamento" (delibera CdA n. 11 dell'8 ottobre 2026, Punto 2 lett. D e Punto 4; delibera n. 12 del 14 ottobre 2026, Punto 2). Destinata a finance.toscanadiagnostica.it. Stesso stack e stessa interfaccia di contracts, cash, sgi e shipment.

## Regole dei poteri applicate

- Fino a 50.000 euro: firma singola dell'AD o del CFO, se l'operazione è a budget o deriva da obblighi già autorizzati. Finance Support indica chi firma.
- Oltre 50.000 e fino a 250.000 euro: autorizzazione congiunta AD + CFO.
- Oltre 250.000 euro: delibera preventiva del CdA (numero e data obbligatori) più firma congiunta.
- Paghe, imposte, contributi, rate di debito e pagamenti già specificamente approvati: nessuna nuova delibera; restano i poteri di firma per importo.
- Divieto di frazionamento: all'invio in firma l'app somma le istanze verso la stessa controparte (IBAN, P.IVA o ragione sociale) negli ultimi 90 giorni e segnala quando l'aggregato supera una soglia. L'avviso compare in dashboard, nella scheda e nella mail ai firmatari.
- Soglie, finestra di aggregazione, riferimenti normativi e testo dell'autorizzazione sono in Impostazioni, non nel codice.

Nota di governance: il verbale n. 11 al Punto 4 attribuisce ad AD e CFO firma singola in banca fino a 500.000 euro. Le soglie di 50.000/250.000 (Punto 2 lett. D e procura CFO) sono vincoli interni che la banca non applica: questa app è il presidio che li rende tracciabili.

## Flusso

1. Finance Support inserisce l'istanza (stessi campi del modulo: intestazione, dati del pagamento, scaglione, verifiche preliminari) e carica la documentazione di supporto. Il beneficiario viene riconosciuto in anagrafica; un IBAN mai confermato richiede la nota di conferma tramite canale indipendente.
2. Invio in firma: protocollo progressivo (AP-2026-0001), impronta SHA-256 del contenuto, email da amministrazione@toscanadiagnostica.it ai firmatari richiesti con link personale monouso (validità 15 giorni, conservato solo come hash).
3. Firma: il firmatario apre il link, accede con Microsoft 365 (obbligatorio: l'identità Entra deve coincidere con l'utente del link), rivede i dati e firma oppure rifiuta con motivazione. Vengono registrati data, ora, identità, IP, metodo di accesso e impronta del contenuto. Ordine libero tra CEO e CFO.
4. Fino alla prima firma Finance Support può modificare l'istanza: i link emessi decadono e i firmatari ricevono una nuova email con la versione aggiornata (numero di versione e nuova impronta). Un rifiuto annulla firme e link; l'istanza torna a Finance Support per la correzione e il reinvio.
5. A firme complete l'app genera il modulo PDF sul format aziendale, con il blocco firme compilato (chi, quando, impronta), lo archivia e lo invia in allegato a Finance Support e ai firmatari.
6. Finance Support esegue il pagamento in banca e registra data, CRO/TRN ed esecutore: viene generata la versione del modulo con la sezione 5 compilata e l'istanza passa in archivio con allegati e PDF.
7. Solleciti automatici ai firmatari dopo 2 giorni senza firma (configurabile), controllo ogni 6 ore.

## Profili

Finance Support (inserisce, modifica, invia in firma, registra l'esecuzione), CEO e CFO (firmatari: uno solo attivo per ruolo, firmano solo dal link email con sessione Microsoft 365), Consultazione (sola lettura). Il flag Amministratore (su qualunque profilo) abilita Utenti, Impostazioni e Registro attività. Tutti vedono tutte le istanze, la dashboard e l'anagrafica beneficiari.

## Architettura

- server/: Node.js 22, Express, PostgreSQL 16. API REST, sessioni su database, CSRF, rate limit sul login, audit log. Modulo con docxtemplater sul template in server/src/templates (derivato dal DOCX aziendale), PDF con LibreOffice headless. Allegati e PDF nel database (bytea). Email via Microsoft Graph.
- web/: React 18, Vite, Recharts. Interfaccia in italiano, palette aziendale, responsive.
- Dockerfile unico (frontend buildato e servito dal server, LibreOffice incluso). render.yaml per il deploy Blueprint. docker-compose.yml per VPS.

## Deploy su Render (GitHub + Render)

1. Crea il repository GitHub (es. tdfinance/finance) e carica il contenuto di questa cartella.
2. render.com, New > Blueprint, collega il repository: render.yaml crea il database e il servizio web Docker. Primo build 5-8 minuti (LibreOffice).
3. Nel pannello del servizio inserisci SEED_ADMIN_PASSWORD (min 12 caratteri) e le variabili ENTRA_* (sotto). Al primo accesso con password l'app chiede di cambiarla e di attivare la verifica in due passaggi.
4. Dominio: Settings > Custom Domains > finance.toscanadiagnostica.it, poi record CNAME `finance` verso td-finance.onrender.com. BASE_URL è già sul dominio ufficiale: l'host tecnico resta raggiungibile e viene reindirizzato. Attenzione: i link di firma nelle email usano BASE_URL, quindi il dominio deve essere attivo prima di inviare la prima istanza (oppure impostare temporaneamente BASE_URL sull'host onrender).
5. Utenti: censisci CFO (Vincenzo Malenchini), Finance Support e i profili di consultazione con l'email del tenant Microsoft 365. L'amministratore seed è Francesco Epifani con profilo CEO.
6. Impostazioni: completa l'IBAN del conto di addebito (il seed inserisce Banco Fiorentino con IBAN segnaposto) e verifica l'invio email con il pulsante "Verifica".

Costo indicativo: 7 $/mese web + 6 $/mese database basic-256mb (verificare i listini). Il piano free non va bene (il servizio dorme e il database viene cancellato).

## Microsoft 365 (Entra ID): accesso e invio email

Serve un Global Administrator del tenant.

1. Entra ID > App registrations > New registration: nome "TD Finance", account solo di questa organizzazione, piattaforma Web, redirect URI `https://finance.toscanadiagnostica.it/api/auth/entra/callback` (aggiungere anche `https://td-finance.onrender.com/api/auth/entra/callback` finché il dominio non è attivo).
2. Certificates & secrets > New client secret (24 mesi): copiare subito il valore.
3. Token configuration > Add optional claim > ID token > `email`.
4. API permissions > Add a permission > Microsoft Graph > Application permissions > `Mail.Send` > Grant admin consent. Serve per inviare da amministrazione@toscanadiagnostica.it.
5. Limitare il permesso alla sola casella mittente (Exchange Online PowerShell, consigliato):
   ```powershell
   New-DistributionGroup -Name "TD Finance Mail Senders" -Type Security
   Add-DistributionGroupMember -Identity "TD Finance Mail Senders" -Member amministrazione@toscanadiagnostica.it
   New-ApplicationAccessPolicy -AppId <Application (client) ID> -PolicyScopeGroupId "TD Finance Mail Senders" -AccessRight RestrictAccess -Description "TD Finance: invio solo da amministrazione@"
   Test-ApplicationAccessPolicy -AppId <Application (client) ID> -Identity amministrazione@toscanadiagnostica.it
   ```
   Senza questa policy l'app potrebbe inviare da qualunque casella del tenant.
6. Overview: Directory (tenant) ID e Application (client) ID. Render > Environment: ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET, MAIL_MODE=GRAPH, MAIL_SENDER. Riavviare.
7. Ogni utente va censito in Utenti con la stessa email dell'account Microsoft 365. La firma richiede sempre la sessione Microsoft 365 (SIGN_ALLOW_LOCAL=false in produzione): anche un utente con password deve rientrare con il pulsante Microsoft per firmare.

## Sviluppo locale

```bash
docker run -d --name tdfdb -p 5432:5432 -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=finance postgres:16-alpine
cd server && npm install
DATABASE_URL=postgres://postgres:dev@localhost:5432/finance SEED_ADMIN_EMAIL=tu@esempio.it SEED_ADMIN_PASSWORD=Password-Temporanea-1 REQUIRE_TOTP_FOR_ADMINS=false SIGN_ALLOW_LOCAL=true MAIL_MODE=LOG npm start
cd web && npm install && npm run dev   # proxy delle API su :3000
```

Con MAIL_MODE=LOG nessuna email parte: i link di firma compaiono nel log del server e nell'app dopo l'invio in firma. Con SIGN_ALLOW_LOCAL=true si può firmare con sessione locale (solo sviluppo). Per i PDF serve LibreOffice (`soffice` nel PATH o SOFFICE_BIN); senza, i moduli vengono prodotti in DOCX.

## Template del modulo

server/src/templates/autorizzazione_pagamento.docx è generato dal modello aziendale in tools/assets con `python3 tools/build_template.py` (python-docx): i campi diventano segnaposto docxtemplater, viene aggiunta la riga dello scaglione a firma singola e la riga di tracciabilità (istanza, versione, impronta SHA-256). Per aggiornare il modello sostituire il DOCX in tools/assets e rilanciare lo script; titolo, epigrafe e testo dell'autorizzazione si modificano invece dalle Impostazioni.

## API

Tutte sotto /api, sessione via cookie, header `X-Requested-With: td-finance` sulle richieste che modificano dati.

- auth: config, login, totp, logout, me, change-password, totp/setup, totp/enable, entra/login (?returnTo=), entra/callback
- users, settings, settings/mail-status, bank-accounts, beneficiaries, beneficiaries/ibans/:id/verify, audit
- requests (GET lista con filtri status/tier/year/q/mine, POST, GET/PUT :id, :id/submit, :id/resend, :id/cancel, :id/execute, :id/attachments, :id/preview)
- attachments/:id, documents/:id
- sign/:token (GET stato, POST firma, POST reject)
- stats/summary

## Prossime funzionalità (predisposte)

Lo schema e la struttura delle pagine sono pensati per aggiungere altri step autorizzativi dell'Area Finance con lo stesso motore (istanza, firme via link, PDF, archivio): consenso scritto del CFO sui contratti 100-250 mila euro, approvazione delle spese fuori budget oltre 20 mila euro, rendiconto periodico al CdA delle operazioni firmate, export Excel del registro per l'organo di controllo e l'OdV.

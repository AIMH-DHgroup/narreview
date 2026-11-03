# SMBVT

SMBVT e' una web app per creare, salvare, visualizzare e pubblicare narrazioni basate su entita' Wikidata/Wikipedia.

L'app gira in PHP + JavaScript, salva i dati in PostgreSQL e genera due famiglie di visualizzazioni:

- visualizzazione nuova verticale/3D in `verticalstorymap3D/`
- visualizzazione storica orizzontale/timeline in `storymaps/`

## Root reale del progetto

Nel setup locale visto durante il refactor, la root applicativa e':

`C:\xampp\htdocs\SMBVTWebAppXampMappa2.0\var\www\tooldlnarratives.eu`

## Flusso principale

1. L'utente apre `SMBVT_2.0.html`
2. Fa login contro PostgreSQL tramite `PHP/conn2.php`
3. Sceglie una narrazione esistente, una nuova entita' Wikidata oppure importa una narrazione JSON
4. Si apre `toolNew.html?idwiki=...` oppure `toolNew.html?idwiki=...&idnar=...`
5. Il builder inizializza la narrativa tramite `PHP/initNarrative.php`
6. Se la narrativa e' nuova e mancano dati locali, il client interroga Wikidata/Wikipedia
7. Gli eventi, le entita', le relazioni e i metadata vengono salvati in PostgreSQL
8. L'utente puo' fare preview oppure publish
9. Il publish genera:
   - `storymaps/[USER]/N[ID]/slide.json`
   - `storymaps/[USER]/N[ID]/index.html`
   - file JSON/Ontologia in `json/` e `owl/`

## File principali

### Home e login

- `SMBVT_2.0.html`
  Home principale, login e lista narrazioni

- `lib/demo-introNew.js`
  JavaScript attivo della home:
  - controlla la sessione
  - esegue il login
  - mostra le narrazioni dell'utente
  - apre `toolNew.html`
  - legge e invia i file JSON da importare
  - chiede il subject con ricerca Wikidata quando manca dal file

### Builder attivo

- `toolNew.html`
  Interfaccia principale di editing della narrazione

- `lib/demo-narraMapsNew.ui.js`
  Layer UI condiviso del builder:
  - binding eventi statici e dinamici
  - helper AJAX del client
  - helper di chiusura popup / coordinate copy markup

- `lib/demo-narraMapsNew.wikidata.js`
  Layer fetch entita' del builder:
  - SPARQL verso Wikidata
  - bootstrap soggetto e entita' correlate
  - fetch Wikipedia di supporto

- `lib/demo-narraMapsNew.persistence.js`
  Layer persistenza del builder:
  - save/delete oggetti narrativa
  - titolo narrativa
  - upload immagini
  - preview / publish / OWL / logout

- `lib/demo-narraMapsNew.events.js`
  Layer eventi/form del builder:
  - mapping form -> JSON evento
  - load/save/delete evento
  - validazione form e reset workspace

- `lib/demo-narraMapsNew.aton.js`
  Layer ATON del builder:
  - caricamento viewer locale per editing evento Aton
  - selezione viewpoint tramite viewer
  - cattura camera libera
  - sincronizzazione `annotationNumber3DModel` / `annotationNumber3DModelCustom`

- `lib/demo-narraMapsNew.sketchfab.js`
  Layer Sketchfab del builder:
  - caricamento viewer locale per editing evento Sketchfab
  - selezione annotazione tramite viewer
  - cattura camera libera
  - sincronizzazione `annotationNumber3DModel` / `annotationNumber3DModelCustom`

- `lib/demo-narraMapsNew.map.js`
  Layer mappa del builder:
  - editor mappa inline nel form evento `map`
  - disegno diretto di un punto o di un poligono evento
  - visualizzazione live delle geometrie entita' selezionate con `showOnMap`
  - gestione viewport/autozoom e salvataggio `mapZoom`

- `lib/demo-narraMapsNew.js`
  File principale residuo del builder:
  - bootstrap generale della pagina
  - rendering entita' e popover
  - timeline/relazioni/utility rimaste condivise

### Backend attivo

- `PHP/api_helpers.php`
  Helper condivisi del backend:
  - sessione
  - risposte JSON
  - gestione path
  - helper DB
  - helper narrativa

- `PHP/PgConn.php`
  Bootstrap della connessione PostgreSQL

- `PHP/initNarrative.php`
  Endpoint principale di bootstrap del builder

- `PHP/session.php`
  Sessione della home

- `PHP/conn2.php`
  Login username/password

- `PHP/insertDb.php`
  Salvataggio singolo di un record della narrativa

- `PHP/saveObjectsBatch.php`
  Salvataggio batch, usato soprattutto per il bootstrap entita' da SPARQL

- `PHP/importNarrative.php`
  Import transazionale di una nuova narrativa da JSON

- `PHP/deleteDb.php`
  Cancellazione singolo record

- `PHP/narrationTitle.php`
  Lettura/aggiornamento del titolo narrativa

- `PHP/publishAndTriplifyNarration.php`
  Publish della narrativa e chiamata al triplificatore Java

- `PHP/saveTempJsonPreviewStorymap.php`
  Salva il JSON temporaneo per la preview

- `PHP/uploadImage.php`
  Upload immagine di entita'

- `PHP/uploadEventImage.php`
  Upload immagine evento / background / cover

- `PHP/downloadOwl.php`
  Verifica esistenza OWL

- `PHP/deleteNarration.php`
  Cancella una narrativa completa

- `PHP/sessionClose.php`
  Logout

## Come sono salvati i dati in PostgreSQL

Esistono due livelli:

1. Tabella `narrations`
   Contiene i metadati delle narrazioni:
   - id narrativa
   - titolo
   - utente
   - soggetto Wikidata

2. Una tabella dedicata per ogni narrativa
   Nome costruito come:

`[idNarration][storageUser]-[subjectIdLowercase]`

Esempio:

`3248adminNarra.1-q1067`

Dentro questa tabella ogni riga contiene:

- `id`
- `value` JSONB

Tipi di record principali:

- `A1`: metadata della narrativa
- `D1`: relazioni fra eventi
- `ev...`: eventi
- `Q...`: entita' Wikidata
- `U...`: entita' custom/manuali

## Inizializzazione di una narrativa

Il builder usa `PHP/initNarrative.php`.

Questo endpoint:

1. verifica che l'utente sia loggato
2. se manca `idnar`, crea una nuova riga in `narrations`
3. determina lo `storageUser` corretto
4. crea la tabella narrativa se non esiste
5. legge dal DB:
   - eventi
   - entita'
   - `A1`
   - `D1`
6. restituisce tutto al client in un solo payload JSON

Se l'entita' soggetto non e' gia' salvata nel DB locale, il client parte con il recupero da Wikidata/Wikipedia.

## Importazione di una narrativa da JSON

La home `SMBVT_2.0.html` permette di creare una nuova narrativa caricando un file JSON.

Il client gestisce il flusso in `lib/demo-introNew.js`:

1. legge il file localmente con `FileReader`
2. verifica se i metadata contengono un subject Wikidata valido
3. se il subject manca, apre un popup con la stessa ricerca Wikidata usata da `wd-search`
4. invia file e subject a `PHP/importNarrative.php` in una singola richiesta multipart
5. dopo il commit apre `toolNew.html?idwiki=...&idnar=...`

### Formati supportati

Sono riconosciuti tre casi prodotti dall'applicazione, ricondotti a due envelope JSON.

Download JSON dal builder e file in `json/narratives/`:

```json
{
  "narra": {},
  "events": {},
  "entities": {}
}
```

Storymap pubblicata, normalmente `storymaps/[USER]/N[ID]/slide.json`:

```json
{
  "A1": {},
  "events": {},
  "items": {},
  "slides": []
}
```

Il mapping verso la tabella PostgreSQL della nuova narrativa e':

| JSON sorgente | Record PostgreSQL |
| --- | --- |
| `narra` oppure `A1` | `A1` |
| valori di `events` | `ev...` |
| valori di `entities` oppure `items` | `Q...` / `U...` |
| `D1`, se presente | `D1` |
| `slides` | non importato |

`slides` non viene importato perche' e' una copia degli eventi arricchita per la visualizzazione. La fonte canonica e' sempre `events`.

Durante l'import, le entita' Wikidata il cui campo `type` contiene `Q15474042`, `Q4167836` o `Q186081` sono escluse dai record della nuova narrativa e rimosse da `props` degli eventi. Il testo descrittivo degli eventi e il JSON sorgente restano invariati.

### Subject Wikidata

L'import cerca il subject in:

- `narra.subject` per il formato Download JSON / `json/narratives`
- `A1.subject` per il formato storymap pubblicato

Il valore deve essere un QID come `Q1067`. Se manca o non e' valido, la home chiede all'utente di cercare e selezionare un soggetto da Wikidata.

I file storici attualmente presenti in `json/narratives/` non contengono `narra.subject`, ma sono compatibili: richiedono semplicemente la selezione nel popup.

### Ownership e identita' della nuova narrativa

L'import crea sempre una nuova narrativa appartenente all'utente autenticato. I dati di proprieta' contenuti nel file non sono considerati attendibili.

Il backend quindi:

- usa l'ID utente della sessione per `narrations.user`
- costruisce `id_dbname` e il nome della tabella con lo `storageUser` della sessione
- assegna un nuovo ID PostgreSQL con `INSERT ... RETURNING id`
- riscrive `A1._id`, `A1.id`, `A1.idNarra` e `A1.author`
- conserva il titolo e gli altri metadata narrativi importabili

Un JSON creato da un altro utente diventa quindi una nuova copia modificabile dall'utente che lo importa. Il vecchio `A1.author` non influenza autorizzazioni o nome della tabella.

### Normalizzazione e compatibilita'

Durante l'import vengono verificati:

- envelope JSON supportato
- ID evento con prefisso `ev`
- entita' Wikidata `Q...` ed entita' manuali `U...`
- coerenza fra chiave dell'oggetto e proprieta' `_id`
- limite massimo di 2.000 eventi
- limite massimo di 10.000 entita'
- dimensione massima del file pari a 30 MB

Per gli eventi storici senza `formType`, il tipo viene inferito in quest'ordine:

1. `Aton` se esiste `Atonid`
2. `sketchfab` se esiste `sketchfabid`
3. `map` se esistono coordinate, poligono o `slideType = geographic`
4. `slide` negli altri casi

Il valore legacy `Aton 2` viene normalizzato in `Aton`.

### Transazione PostgreSQL

L'intero import avviene in una sola transazione:

1. inserimento nella tabella `narrations`
2. creazione della tabella dedicata
3. riscrittura e inserimento di `A1`
4. inserimento opzionale di `D1`
5. inserimento di eventi ed entita'
6. commit

PostgreSQL gestisce anche `CREATE TABLE` in modo transazionale. Se un passaggio fallisce, il rollback elimina sia la riga centrale sia la tabella e impedisce di lasciare una narrativa parziale.

### File dell'import

- `SMBVT_2.0.html`: markup del selettore JSON
- `lib/demo-introNew.js`: lettura file, subject, popup Wikidata, upload e redirect
- `lib/narraintro.css`: stile del form e del popup
- `PHP/importNarrative.php`: validazione, normalizzazione e transazione
- `PHP/api_helpers.php`: inserimento condiviso della riga `narrations`

## Fetch da Wikidata e Wikipedia

Il builder usa soprattutto queste funzioni distribuite tra i moduli `lib/demo-narraMapsNew*.js`:

- `makeQuery(...)`
- `sparqlRequest(...)`
- `sparqlToItem(...)`
- `wikipediaRequest(...)`
- `getWikipediaTitle(...)`
- `newEntityRequest(...)`

### Bootstrap iniziale

Quando la narrativa e' nuova:

1. `initNarrative.php` restituisce una narrativa vuota
2. il client vede che il soggetto non e' nel DB locale
3. parte `sparqlRequest([narra.subjectID], ...)`
4. le entita' recuperate vengono trasformate in oggetti interni
5. vengono salvate in batch nel DB tramite `PHP/saveObjectsBatch.php`

### Aggiunta di nuove entita'

Quando l'utente aggiunge una nuova entita' dal builder:

1. si passa da `newEntityRequest(...)`
2. si recupera il `qid`
3. si richiama `sparqlRequest(...)`
4. l'entita' viene aggiunta a `narra.items`
5. viene salvata nel DB

## Salvataggio eventi

Nel builder esistono 4 tipi principali di evento:

1. `map`
   Evento geografico con:
   - punto
   - poligono
   - colore marker
   - `mapZoom` opzionale salvato dall'editor mappa

2. `sketchfab`
   Evento con modello 3D Sketchfab:
   - `sketchfabid`
   - `annotationNumber3DModel` se l'utente seleziona un'annotazione
   - `annotationNumber3DModelCustom` se l'utente salva una camera libera

3. `Aton`
   Evento con modello 3D ATON:
   - `Atonid`
   - `annotationNumber3DModel` se l'utente seleziona un viewpoint nominato
   - `annotationNumber3DModelCustom` se l'utente salva una camera libera

4. `slide`
   Evento slide con:
   - `backgroundImg`
   - immagini/video

### Esempi evento ATON

Con viewpoint nominato:

```json
{
  "formType": "Aton",
  "Atonid": "bfanini/20210406-nnus62igu",
  "annotationNumber3DModel": "pov-5u1tnbhx4"
}
```

Con camera custom:

```json
{
  "formType": "Aton",
  "Atonid": "vhlab/sid-ac9lddw5w",
  "annotationNumber3DModelCustom": {
    "position": [0.0135, 63.4992, 0.5434],
    "target": [-0.0679, 63.8048, 3.0431],
    "fov": 61
  }
}
```

Esempio Sketchfab con annotazione:

```json
{
  "formType": "sketchfab",
  "sketchfabid": "60523828541544d3aee54268eccc770f",
  "annotationNumber3DModel": "2"
}
```

Esempio Sketchfab con camera custom:

```json
{
  "formType": "sketchfab",
  "sketchfabid": "60523828541544d3aee54268eccc770f",
  "annotationNumber3DModelCustom": {
    "position": [1.2, 0.5, -0.7],
    "target": [0.0, 0.3, 0.0],
    "fov": 45
  }
}
```

### Punto centrale del salvataggio

Il salvataggio passa da `saveEvent(...)` in `lib/demo-narraMapsNew.events.js`.

Il JSON finale dell'evento viene costruito in un solo punto principale:

- `makeTemp(...)`

Helper usati per raccogliere i dati:

- `collectEventFormValues(...)`
- `collectEventProps(...)`
- `collectEventDisplayState(...)`
- `getEffectiveEventFormType(...)`

Per gli eventi ATON, la raccolta del dato camera/viewpoint passa anche dal modulo:

- `lib/demo-narraMapsNew.aton.js`

Per gli eventi mappa, il builder usa un editor inline dedicato che continua comunque a popolare i campi legacy:

- `latitud`
- `longitud`
- `polygon`
- `eventPlaceLabel`
- `mapZoom`

In questo modo la visualizzazione pubblicata continua a funzionare senza cambiare formato dati.

Questo e' importante: se vuoi aggiungere un nuovo campo al JSON degli eventi del builder, il punto giusto da toccare e' soprattutto `makeTemp(...)`, insieme alla raccolta del valore dal form.

### Controllo modifiche prima del salvataggio

Prima di salvare un evento gia' esistente, il builder confronta il payload attuale con l'ultimo salvato.

Le funzioni principali sono:

- `checkNewChanges()`
- `checkChangesFromLastSave(...)`
- `objectEquals(...)`

Il confronto riusa la stessa pipeline di costruzione del payload usata da `saveEvent(...)`, in modo da evitare divergenze tra:

- “quello che verrebbe salvato”
- “quello che viene confrontato”

## Caricamento evento nel form

Il caricamento di un evento gia' esistente avviene con:

- `loadEvent(evid)`

Anche qui la logica e' stata accorpata in helper, per avere un mapping chiaro `evento JSON -> form`:

- `applyCommonEventFieldsToForm(...)`
- `applyMapEventFieldsToForm(...)`
- `applyEventMediaToForm(...)`
- `loadEventDigitalObjects(...)`
- `ensureEventMediaDefaults(...)`

Quindi oggi il mapping e' piu' simmetrico:

- form -> JSON evento
- JSON evento -> form

## Publish e preview

### Preview nuova

1. il builder costruisce il payload slide in memoria
2. chiama `PHP/saveTempJsonPreviewStorymap.php`
3. apre `verticalstorymap3D/previewStorymap.php`

### Publish

Il publish attivo usa `PHP/publishAndTriplifyNarration.php`.

Questo endpoint:

1. legge eventi/entita'/A1 dal DB
2. costruisce un JSON per il triplificatore Java
3. salva il JSON in `json/`
4. lancia `Triplify/triplify.jar`
5. genera l'OWL in `owl/`
6. salva la visualizzazione storica in `storymaps/[USER]/N[ID]/`

## Visualizzazioni

### Nuova visualizzazione verticale/3D

File principali:

- `verticalstorymap3D/index.php`
- `verticalstorymap3D/previewStorymap.php`
- `verticalstorymap3D/visualizeOrizontalStorymapIndex.js`
- `verticalstorymap3D/aton-viewer.html`
- `verticalstorymap3D/aton-viewer.js`
- `HTML/aton-event-viewer.html`
- `HTML/aton-event-viewer.js`
- `HTML/sketchfab-event-viewer.html`
- `HTML/sketchfab-event-viewer.js`

URL tipico:

`verticalstorymap3D/index.php?id=N3248&user=adminNarra.1`

### Vecchia visualizzazione orizzontale/timeline

Output pubblicato:

- `storymaps/[USER]/N[ID]/index.html`
- `storymaps/[USER]/N[ID]/slide.json`

Runtime JS:

- `storymaps/lib/visualization.js`

URL tipici:

- `storymaps/[USER]/N[ID]/?visualization=map`
- `storymaps/[USER]/N[ID]/?visualization=timeline`

## Demo e file legacy

Nel repository esistono ancora file demo/legacy.

Quelli che oggi contano davvero per il flusso principale sono solo:

- `SMBVT_2.0.html`
- `toolNew.html`
- `lib/demo-introNew.js`
- `lib/demo-narraMapsNew.js`
- gli endpoint PHP attivi descritti sopra

Per una mappa piu' precisa dei file attivi e legacy mantenuti, vedi:

- `ACTIVE_PATHS.md`

## Dove mettere mano se devi cambiare qualcosa

### Login / home

- `SMBVT_2.0.html`
- `lib/demo-introNew.js`
- `PHP/session.php`
- `PHP/conn2.php`

### Bootstrap narrativa

- `PHP/initNarrative.php`
- `PHP/api_helpers.php`

### Import narrativa JSON

- `SMBVT_2.0.html`
- `lib/demo-introNew.js`
  - `createWikidataSuggestions(...)`
  - `uploadNarrativeJson(...)`
  - `showJsonSubjectModal(...)`
- `lib/narraintro.css`
- `PHP/importNarrative.php`
- `PHP/api_helpers.php`
  - `insert_narration_record(...)`

### Salvataggio eventi

- `lib/demo-narraMapsNew.events.js`
  - `saveEvent(...)`
  - `makeTemp(...)`
  - `collectEventFormValues(...)`
  - `collectEventProps(...)`
  - `collectEventDisplayState(...)`

### Caricamento eventi nel form

- `lib/demo-narraMapsNew.events.js`
  - `loadEvent(...)`
  - `applyCommonEventFieldsToForm(...)`
  - `applyMapEventFieldsToForm(...)`
  - `applyEventMediaToForm(...)`

- `lib/demo-narraMapsNew.map.js`
  - `loadFromEvent(...)`
  - `refreshAfterEntityLoad(...)`
  - `getSelectionData(...)`

### Fetch entita' da Wikidata

- `lib/demo-narraMapsNew.wikidata.js`
  - `sparqlRequest(...)`
  - `sparqlToItem(...)`
  - `newEntityRequest(...)`
  - `makeQuery(...)`

### Persistenza DB

- `PHP/insertDb.php`
- `PHP/saveObjectsBatch.php`
- `PHP/deleteDb.php`

### Publish / preview

- `lib/demo-narraMapsNew.persistence.js`
  - `publishNarration(...)`
  - `downloadOwl(...)`

- `PHP/publishAndTriplifyNarration.php`
- `PHP/saveTempJsonPreviewStorymap.php`
- `verticalstorymap3D/previewStorymap.php`
- `verticalstorymap3D/index.php`
- `storymaps/lib/visualization.js`

## Nota finale

Il progetto e' cresciuto nel tempo e contiene ancora file storici, ma il flusso attivo oggi e' stato rifattorizzato per concentrare la logica nei punti principali e ridurre la duplicazione.

Se devi modificare il comportamento del builder nuovo, la strategia giusta e' partire sempre da:

- `lib/demo-narraMapsNew.js`
- `lib/demo-narraMapsNew.ui.js`
- `lib/demo-narraMapsNew.wikidata.js`
- `lib/demo-narraMapsNew.persistence.js`
- `lib/demo-narraMapsNew.events.js`
- `PHP/initNarrative.php`
- `PHP/api_helpers.php`
- `PHP/publishAndTriplifyNarration.php`

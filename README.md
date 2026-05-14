# Impostore

Gioco da tavolo digitale ispirato a *Spyfall* / *Among Us*. Un giocatore alla volta vede il proprio ruolo sul telefono: i **civili** ricevono la parola segreta, gli **impostori** devono bluffare senza conoscerla, **Mr. White** non sa nulla e deve sopravvivere ascoltando.

## Come si gioca

1. Imposta il numero di giocatori e i ruoli (impostori, Mr. White).
2. Premi **Inizia la partita**: ogni giocatore passa il telefono a turno e vede il proprio ruolo in privato.
3. Tutti discutono descrivendo la parola a turno senza nominarla.
4. Si vota chi eliminare: se tutti gli impostori vengono scoperti vincono i civili, altrimenti vincono gli impostori.
5. Mr. White, se eliminato, può tentare di indovinare la parola per vincere da solo.

## Funzionalità

- **Punteggio sessione** — traccia le vittorie di civili, impostori e Mr. White nel corso di più round consecutivi
- **Log partita** — a fine round mostra chi aveva quale ruolo con badge colorati
- **Indizi illimitati** — ogni voce può avere quanti indizi vuoi, anche multi-parola (`parola,indizio lungo,altro indizio`)
- **Tema scuro** — rilevamento automatico dal sistema + toggle manuale ☀️/🌙
- **Offline-first** — Service Worker che mette in cache tutti gli asset; funziona senza connessione dopo il primo caricamento
- **Nomi salvati** — i nomi dei giocatori persistono tra una sessione e l'altra (× per rimuovere singolarmente)
- **Pacchetti custom** — crea, modifica, esporta e importa pacchetti JSON direttamente dall'app

## Pacchetti inclusi

| Pacchetto | Descrizione |
|-----------|-------------|
| 📦 Facile | Parole quotidiane, adatto a tutti |
| ⚡ Medio | Concetti più astratti e situazionali |
| 🔥 Difficile | Termini filosofici, economici, retorici |
| 💎 Brand | Marchi famosi (Apple, Gucci, Nike…) |
| 🎲 Board Games | Giochi da tavolo (Catan, D&D, Cluedo…) |
| 🔥 Young Slang | Gergo giovanile (rizz, aura, lowkey…) |
| 📺 Boomer Words | Tecnologia e costumi di ieri (fax, VHS…) |
| 🌶 Spicy | Situazioni imbarazzanti e emozioni difficili |
| ⛏ Minecraft | Mob, biomi, oggetti e meccaniche |
| 👾 Video Games | Videogiochi iconici di ogni genere |
| 🐸 Classic Memes | Meme storici di internet (Doge, Rickroll…) |
| 🎸 Strumenti | Strumenti musicali di tutto il mondo |

## Struttura del progetto

```
index.html          — markup HTML puro
style.css           — tutti gli stili + dark mode
script.js           — logica dell'app e UI
sw.js               — Service Worker per offline
data/
  manifest.json     — lista dei pacchetti da caricare
  packet-*.json     — dati dei singoli pacchetti
```

## Aggiungere un pacchetto

1. Crea `data/packet-nome.json` con la struttura:
   ```json
   {
     "id": "nome",
     "label": "Nome Visibile",
     "emoji": "🎯",
     "colorIdx": 3,
     "lines": [
       "parola,indizio1,indizio2 multi parola,indizio3",
       "altra parola,solo un indizio"
     ]
   }
   ```
2. Aggiungilo a `data/manifest.json`.

`index.html` e `sw.js` si aggiornano automaticamente alla prossima installazione del service worker.

## Sviluppo locale

Serve un server HTTP (le `fetch` non funzionano con `file://`):

```bash
python3 -m http.server
# oppure
npx serve .
```

## Deploy

Pubblicato automaticamente su **GitHub Pages** ad ogni push su `main` tramite `.github/workflows/static.yml`.

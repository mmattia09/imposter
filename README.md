# Impostore

Gioco da tavolo digitale ispirato a *Spyfall* / *Among Us*. Un giocatore alla volta vede il proprio ruolo sul telefono: i **civili** ricevono la parola segreta, gli **impostori** devono bluffare senza conoscerla, **Mr. White** non sa nulla e deve sopravvivere ascoltando.

## Come si gioca

1. Imposta il numero di giocatori e i ruoli (impostori, Mr. White).
2. Premi **Inizia la partita**: ogni giocatore passa il telefono a turno e vede il proprio ruolo in privato.
3. Tutti discutono descrivendo la parola a turno senza nominarla.
4. Si vota chi eliminare: se tutti gli impostori vengono scoperti vincono i civili, altrimenti vincono gli impostori.
5. Mr. White, se eliminato, può tentare di indovinare la parola per vincere da solo.

## Struttura del progetto

```
index.html          — markup HTML puro
style.css           — tutti gli stili
script.js           — logica dell'app e UI
data/
  packet-easy.js    — pacchetto parole "Facile"
  packet-medium.js  — pacchetto parole "Medio"
  packet-hard.js    — pacchetto parole "Difficile"
```

## Pacchetti parole

I pacchetti predefiniti (Facile, Medio, Difficile) si trovano in `data/`. Ogni riga segue il formato:

```
parola,indizio1,indizio2,indizio3
```

Gli indizi sono opzionali e vengono mostrati agli impostori se l'opzione è attiva.

Dall'app si possono anche creare, modificare, esportare e importare pacchetti custom in formato JSON.

## Deploy

Il sito viene pubblicato automaticamente su **GitHub Pages** ad ogni push su `main` tramite il workflow `.github/workflows/static.yml`.

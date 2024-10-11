const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.post('/api/analyze', async (req, res) => {
  try {
    const { monthlyData, analysis } = req.body;
    const apiKey = process.env.GPT_API_KEY;

    if (!apiKey) {
      throw new Error('API key non trovata');
    }

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4",
      messages: [{
        role: "system",
        content: "Sei un esperto consulente per saloni di parrucchieri. Analizza i dati forniti e genera suggerimenti dettagliati per migliorare il business."
      }, {
        role: "user",
        content: `Analizza questi dati del salone e l'analisi fornita per diversi mesi. Genera 3-5 suggerimenti dettagliati per migliorare il business, concentrandoti su trend, punti di forza e di debolezza degli operatori e dei servizi nel tempo: 
        Dati: ${JSON.stringify(monthlyData)}
        Analisi: ${JSON.stringify(analysis)}`
      }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    res.json(response.data.choices[0].message.content);
  } catch (error) {
    console.error('Errore nella chiamata a GPT:', error);
    res.status(500).json({ error: "Si è verificato un errore nell'analisi dei dati." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
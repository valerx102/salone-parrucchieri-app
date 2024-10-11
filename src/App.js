import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const App = () => {
  const [monthlyData, setMonthlyData] = useState({});
  const [analysis, setAnalysis] = useState(null);
  const [suggestions, setSuggestions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('panoramica');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [fileCount, setFileCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const monthOrder = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const sortMonths = (months) => {
    return months.sort((a, b) => {
      const [monthA, yearA] = a.split('_');
      const [monthB, yearB] = b.split('_');
      if (yearA !== yearB) {
        return parseInt(yearA) - parseInt(yearB);
      }
      return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
    });
  };

  const onDrop = useCallback((acceptedFiles) => {
    setIsLoading(true);
    setFileCount(acceptedFiles.length);
    console.log(`Numero di file accettati: ${acceptedFiles.length}`);

    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const cleanedJson = json.filter(row => row.length > 0);

        const match = file.name.match(/(\w+)_(\d{4})/);
        const monthYear = match ? `${match[1]}_${match[2]}` : file.name;

        setMonthlyData(prevData => {
          const newData = { ...prevData, [monthYear]: cleanedJson };
          console.log(`File elaborato: ${monthYear}`);
          console.log(`Numero di file elaborati: ${Object.keys(newData).length}`);
          return newData;
        });
      };
      reader.readAsArrayBuffer(file);
    });
  }, []);

  useEffect(() => {
    if (Object.keys(monthlyData).length === fileCount && fileCount > 0) {
      console.log('Tutti i file sono stati elaborati. Avvio analisi...');
      const combinedAnalysis = analyzeData(monthlyData);
      setAnalysis(combinedAnalysis);
      setIsLoading(false);
    }
  }, [monthlyData, fileCount]);

  const analyzeData = (monthlyData) => {
    console.log('Inizio analisi dei dati...');
    const analysis = {};
    let overallTotalRevenue = 0;
    const overallOperatorTotals = {};
    const overallOperatorHours = {};
    const overallServiceTotals = {};
    const overallOperatorServiceValues = {};
    const overallOperatorServiceCounts = {};
    const overallOperatorTotalRevenue = {};

    Object.entries(monthlyData).forEach(([monthYear, data]) => {
      let totalRevenue = 0;
      const operatorTotals = {};
      const operatorHours = {};
      const serviceTotals = {};
      const operatorServiceValues = {};
      const operatorServiceCounts = {};
      const operatorTotalRevenue = {};

      let currentOperator = '';
      data.slice(1).forEach(row => {
        if (row[0] && row[0] !== 'PARRUCCHIERE') {
          currentOperator = row[0];
        }
        const service = row[1];
        const numero = parseInt(row[2]) || 0;
        const hours = parseFloat(row[3]) || 0;
        const revenue = parseFloat(row[4]) || 0;

        if (service && service !== 'GRUPPO') {
          totalRevenue += revenue;
          overallTotalRevenue += revenue;

          if (!operatorTotals[currentOperator]) operatorTotals[currentOperator] = 0;
          operatorTotals[currentOperator] += revenue;
          if (!overallOperatorTotals[currentOperator]) overallOperatorTotals[currentOperator] = 0;
          overallOperatorTotals[currentOperator] += revenue;

          if (!operatorHours[currentOperator]) operatorHours[currentOperator] = 0;
          operatorHours[currentOperator] += hours;
          if (!overallOperatorHours[currentOperator]) overallOperatorHours[currentOperator] = 0;
          overallOperatorHours[currentOperator] += hours;

          if (!serviceTotals[service]) serviceTotals[service] = 0;
          serviceTotals[service] += revenue;
          if (!overallServiceTotals[service]) overallServiceTotals[service] = 0;
          overallServiceTotals[service] += revenue;

          if (!operatorServiceValues[currentOperator]) operatorServiceValues[currentOperator] = {};
          if (!operatorServiceValues[currentOperator][service]) operatorServiceValues[currentOperator][service] = { revenue: 0, hours: 0 };
          operatorServiceValues[currentOperator][service].revenue += revenue;
          operatorServiceValues[currentOperator][service].hours += hours;

          if (!overallOperatorServiceValues[currentOperator]) overallOperatorServiceValues[currentOperator] = {};
          if (!overallOperatorServiceValues[currentOperator][service]) overallOperatorServiceValues[currentOperator][service] = { revenue: 0, hours: 0 };
          overallOperatorServiceValues[currentOperator][service].revenue += revenue;
          overallOperatorServiceValues[currentOperator][service].hours += hours;

          if (!operatorServiceCounts[currentOperator]) {
            operatorServiceCounts[currentOperator] = 0;
            operatorTotalRevenue[currentOperator] = 0;
          }
          operatorServiceCounts[currentOperator] += numero;
          operatorTotalRevenue[currentOperator] += revenue;

          if (!overallOperatorServiceCounts[currentOperator]) {
            overallOperatorServiceCounts[currentOperator] = 0;
            overallOperatorTotalRevenue[currentOperator] = 0;
          }
          overallOperatorServiceCounts[currentOperator] += numero;
          overallOperatorTotalRevenue[currentOperator] += revenue;
        }
      });

      analysis[monthYear] = {
        totalRevenue,
        sortedServices: Object.entries(serviceTotals)
          .sort(([, a], [, b]) => b - a)
          .reduce((r, [k, v]) => ({ ...r, [k]: v }), {}),
        sortedOperators: Object.entries(operatorTotals)
          .sort(([, a], [, b]) => b - a)
          .reduce((r, [k, v]) => ({ ...r, [k]: v }), {}),
        operatorHours,
        operatorHourlyRates: Object.entries(operatorTotals)
          .map(([operator, revenue]) => ({
            operator,
            rate: revenue / operatorHours[operator]
          }))
          .sort((a, b) => b.rate - a.rate)
          .reduce((acc, { operator, rate }) => {
            acc[operator] = rate;
            return acc;
          }, {}),
        operatorAverageServiceValues: Object.entries(operatorTotalRevenue)
          .map(([operator, totalRevenue]) => ({
            operator,
            averageValue: totalRevenue / operatorServiceCounts[operator]
          }))
          .sort((a, b) => b.averageValue - a.averageValue)
          .reduce((acc, { operator, averageValue }) => {
            acc[operator] = averageValue;
            return acc;
          }, {}),
        operatorServiceCounts
      };
    });

    analysis.overall = {
      totalRevenue: overallTotalRevenue,
      sortedServices: Object.entries(overallServiceTotals)
        .sort(([, a], [, b]) => b - a)
        .reduce((r, [k, v]) => ({ ...r, [k]: v }), {}),
      sortedOperators: Object.entries(overallOperatorTotals)
        .sort(([, a], [, b]) => b - a)
        .reduce((r, [k, v]) => ({ ...r, [k]: v }), {}),
      operatorHours: overallOperatorHours,
      operatorHourlyRates: Object.entries(overallOperatorTotals)
        .map(([operator, revenue]) => ({
          operator,
          rate: revenue / overallOperatorHours[operator]
        }))
        .sort((a, b) => b.rate - a.rate)
        .reduce((acc, { operator, rate }) => {
          acc[operator] = rate;
          return acc;
        }, {}),
      operatorAverageServiceValues: Object.entries(overallOperatorTotalRevenue)
        .map(([operator, totalRevenue]) => ({
          operator,
          averageValue: totalRevenue / overallOperatorServiceCounts[operator]
        }))
        .sort((a, b) => b.averageValue - a.averageValue)
        .reduce((acc, { operator, averageValue }) => {
          acc[operator] = averageValue;
          return acc;
        }, {}),
      operatorServiceCounts: overallOperatorServiceCounts
    };

    console.log('Analisi completata');
    return analysis;
  };

  const analyzeWithGPT = async () => {
    if (!monthlyData || !analysis) {
      setSuggestions("Per favore, carica i dati e assicurati che l'analisi sia completata prima di generare i suggerimenti.");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ monthlyData, analysis })
      });

      if (!response.ok) {
        throw new Error(`Errore HTTP! stato: ${response.status}`);
      }

      const result = await response.json();
      setSuggestions(result);
    } catch (error) {
      console.error('Errore nella chiamata al server:', error);
      setSuggestions("Mi dispiace, si è verificato un errore nell'analisi dei dati. " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderChart = (data, options, ChartComponent) => {
    return (
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <ChartComponent data={data} options={{ ...options, maintainAspectRatio: false, responsive: true }} />
      </div>
    );
  };

  const renderCard = (title, content) => {
    return (
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {content}
      </div>
    );
  };

  const renderPanoramica = () => {
    if (!analysis) return null;

    return (
      <div>
        <h2 className="text-2xl font-semibold mb-6">Panoramica</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderCard("Fatturato Totale", 
            <p className="text-xl">CHF {analysis.overall.totalRevenue.toFixed(2)}</p>
          )}
          {renderCard("Servizio più Redditizio", 
            <p>{Object.keys(analysis.overall.sortedServices)[0]} (CHF {Object.values(analysis.overall.sortedServices)[0].toFixed(2)})</p>
          )}
          {renderCard("Servizio meno Redditizio", 
            <p>{Object.keys(analysis.overall.sortedServices)[Object.keys(analysis.overall.sortedServices).length - 1]} (CHF {Object.values(analysis.overall.sortedServices)[Object.values(analysis.overall.sortedServices).length - 1].toFixed(2)})</p>
          )}
          {renderCard("Operatore più Produttivo", 
            <p>{Object.keys(analysis.overall.sortedOperators)[0]} (CHF {Object.values(analysis.overall.sortedOperators)[0].toFixed(2)})</p>
          )}
          {renderCard("Operatore meno Produttivo", 
            <p>{Object.keys(analysis.overall.sortedOperators)[Object.keys(analysis.overall.sortedOperators).length - 1]} (CHF {Object.values(analysis.overall.sortedOperators)[Object.values(analysis.overall.sortedOperators).length - 1].toFixed(2)})
			</p>
          )}
        </div>
      </div>
    );
  };

  const renderAnalisiGlobale = () => {
    if (!analysis) return null;

    const months = sortMonths(Object.keys(analysis).filter(key => key !== 'overall'));
    const revenueData = {
      labels: months,
      datasets: [{
        label: 'Fatturato',
        data: months.map(month => analysis[month].totalRevenue),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    };

    const operatorData = {
      labels: Object.keys(analysis.overall.sortedOperators),
      datasets: [{
        label: 'Fatturato per Operatore',
        data: Object.values(analysis.overall.sortedOperators),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      }]
    };

    const serviceData = {
      labels: Object.keys(analysis.overall.sortedServices),
      datasets: [{
        label: 'Fatturato per Servizio',
        data: Object.values(analysis.overall.sortedServices),
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
      }]
    };

    return (
      <div>
        <h2 className="text-2xl font-semibold mb-6">Analisi Globale</h2>
        {renderCard("Andamento Fatturato nel Tempo", 
          <div style={{height: '300px'}}>
            {renderChart(revenueData, {}, Line)}
          </div>
        )}
        {renderCard("Performance Operatori", 
          <div style={{height: '300px'}}>
            {renderChart(operatorData, {}, Bar)}
          </div>
        )}
        {renderCard("Popolarità Servizi", 
          <div style={{height: '300px'}}>
            {renderChart(serviceData, {}, Bar)}
          </div>
        )}
      </div>
    );
  };

  const renderAnalisiMensile = () => {
    if (!analysis) return null;

    return (
      <div>
        <h2 className="text-2xl font-semibold mb-6">Analisi Mensile</h2>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="p-2 border rounded mb-6 w-full md:w-auto"
        >
          <option value="">Seleziona un mese</option>
          {sortMonths(Object.keys(analysis).filter(key => key !== 'overall')).map(month => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>
        {selectedMonth && (
          <div>
            {renderCard("Fatturato del Mese", 
              <p className="text-xl">CHF {analysis[selectedMonth].totalRevenue.toFixed(2)}</p>
            )}
            {renderCard("Top Servizi", 
              <div style={{height: '300px'}}>
                {renderChart({
                  labels: Object.keys(analysis[selectedMonth].sortedServices),
                  datasets: [{
                    label: 'Fatturato per Servizio',
                    data: Object.values(analysis[selectedMonth].sortedServices),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                  }]
                }, {}, Bar)}
              </div>
            )}
            {renderCard("Performance Operatori", 
              <div style={{height: '300px'}}>
                {renderChart({
                  labels: Object.keys(analysis[selectedMonth].sortedOperators),
                  datasets: [{
                    label: 'Fatturato per Operatore',
                    data: Object.values(analysis[selectedMonth].sortedOperators),
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                  }]
                }, {}, Bar)}
              </div>
            )}
            {renderCard("Valore Ora per Operatore", 
              <div style={{height: '300px'}}>
                {renderChart({
                  labels: Object.keys(analysis[selectedMonth].operatorHourlyRates),
                  datasets: [{
                    label: 'Valore Ora (CHF)',
                    data: Object.values(analysis[selectedMonth].operatorHourlyRates),
                    backgroundColor: 'rgba(255, 159, 64, 0.6)',
                  }]
                }, {}, Bar)}
              </div>
            )}
            {renderCard("Numero Medio Servizi per Operatore", 
              <div style={{height: '300px'}}>
                {renderChart({
                  labels: Object.keys(analysis[selectedMonth].operatorServiceCounts),
                  datasets: [{
                    label: 'Numero Medio Servizi',
                    data: Object.keys(analysis[selectedMonth].operatorServiceCounts).map(
                      op => analysis[selectedMonth].operatorServiceCounts[op]
                    ),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                  }]
                }, {}, Bar)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDettagliOperatori = () => {
    if (!analysis) return null;

    const months = sortMonths(Object.keys(analysis).filter(key => key !== 'overall'));
    const operators = Object.keys(analysis.overall.sortedOperators);

    const hourlyRateData = {
      labels: operators,
      datasets: [{
        label: 'Valore Ora (CHF)',
        data: operators.map(op => analysis.overall.operatorHourlyRates[op]),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      }]
    };

    const serviceCountData = {
      labels: operators,
      datasets: [{
        label: 'Numero Medio Servizi',
        data: operators.map(op => analysis.overall.operatorServiceCounts[op]),
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
      }]
    };

    const fatturateTrendData = {
      labels: months,
      datasets: operators.map((operator, index) => ({
        label: operator,
        data: months.map(month => analysis[month].sortedOperators[operator] || 0),
        borderColor: `hsl(${index * 360 / operators.length}, 70%, 50%)`,
        backgroundColor: `hsla(${index * 360 / operators.length}, 70%, 50%, 0.5)`,
        fill: false,
      }))
    };

    const hourlyRateTrendData = {
      labels: months,
      datasets: operators.map((operator, index) => ({
        label: operator,
        data: months.map(month => analysis[month].operatorHourlyRates[operator] || 0),
        borderColor: `hsl(${index * 360 / operators.length}, 70%, 50%)`,
        backgroundColor: `hsla(${index * 360 / operators.length}, 70%, 50%, 0.5)`,
        fill: false,
      }))
    };

    const averageServiceValueTrendData = {
      labels: months,
      datasets: operators.map((operator, index) => ({
        label: operator,
        data: months.map(month => analysis[month].operatorAverageServiceValues[operator] || 0),
        borderColor: `hsl(${index * 360 / operators.length}, 70%, 50%)`,
        backgroundColor: `hsla(${index * 360 / operators.length}, 70%, 50%, 0.5)`,
        fill: false,
      }))
    };

    return (
      <div>
        <h2 className="text-2xl font-semibold mb-6">Dettagli Operatori</h2>
        {renderCard("Valore Ora per Operatore", 
          <div style={{height: '300px'}}>
            {renderChart(hourlyRateData, {}, Bar)}
          </div>
        )}
        {renderCard("Numero Medio Servizi per Operatore", 
          <div style={{height: '300px'}}>
            {renderChart(serviceCountData, {}, Bar)}
          </div>
        )}
        {renderCard("Trend Fatturato Operatori", 
          <div style={{height: '300px'}}>
            {renderChart(fatturateTrendData, {
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }, Line)}
          </div>
        )}
        {renderCard("Trend Valore Ora Operatori", 
          <div style={{height: '300px'}}>
            {renderChart(hourlyRateTrendData, {
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }, Line)}
          </div>
        )}
        {renderCard("Trend Valore Medio Servizio Operatori", 
          <div style={{height: '300px'}}>
            {renderChart(averageServiceValueTrendData, {
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }, Line)}
          </div>
        )}
      </div>
    );
  };

  const renderDettagliServizi = () => {
    if (!analysis) return null;

    const popularityData = {
      labels: Object.keys(analysis.overall.sortedServices),
      datasets: [{
        label: 'Popolarità Servizi',
        data: Object.values(analysis.overall.sortedServices),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      }]
    };

    const profitabilityData = {
      labels: Object.keys(analysis.overall.sortedServices),
      datasets: [{
        label: 'Redditività Servizi',
        data: Object.values(analysis.overall.sortedServices),
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
      }]
    };

    const months = sortMonths(Object.keys(analysis).filter(key => key !== 'overall'));
    const services = Object.keys(analysis.overall.sortedServices);

    const trendData = {
      labels: months,
      datasets: services.map((service, index) => ({
        label: service,
        data: months.map(month => analysis[month].sortedServices[service] || 0),
        borderColor: `hsl(${index * 360 / services.length}, 70%, 50%)`,
        backgroundColor: `hsla(${index * 360 / services.length}, 70%, 50%, 0.5)`,
        fill: false,
      }))
    };

    return (
      <div>
        <h2 className="text-2xl font-semibold mb-6">Dettagli Servizi</h2>
        {renderCard("Popolarità Servizi", 
          <div style={{height: '300px'}}>
            {renderChart(popularityData, {}, Bar)}
          </div>
        )}
        {renderCard("Redditività Servizi", 
          <div style={{height: '300px'}}>
            {renderChart(profitabilityData, {}, Bar)}
          </div>
        )}
        {renderCard("Trend Popolarità Servizi", 
          <div style={{height: '300px'}}>
            {renderChart(trendData, {
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            }, Line)}
          </div>
        )}
      </div>
    );
  };

  const renderSuggerimenti = () => {
    return (
      <div>
        <h2 className="text-2xl font-semibold mb-6">Suggerimenti</h2>
        <button
          onClick={analyzeWithGPT}
          className="mb-6 px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow hover:bg-blue-600 transition-colors w-full md:w-auto"
        >
          Genera Suggerimenti
        </button>
        {isLoading && <p className="text-center">Generazione in corso...</p>}
        {suggestions && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <p className="whitespace-pre-line">{suggestions}</p>
          </div>
        )}
      </div>
    );
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: true
  });

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* Barra laterale per desktop e menu a discesa per mobile */}
      <div className="md:hidden">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-full bg-blue-500 text-white py-2 px-4 text-left"
        >
          Menu
        </button>
        {isMobileMenuOpen && (
          <nav className="bg-white shadow-md">
            {['panoramica', 'analisiGlobale', 'analisiMensile', 'dettagliOperatori', 'dettagliServizi', 'suggerimenti'].map((section) => (
              <button
                key={section}
                onClick={() => {
                  setActiveSection(section);
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-200"
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </nav>
        )}
      </div>
      <div className="hidden md:block md:w-64 bg-white shadow-md">
        <nav className="mt-5">
          {['panoramica', 'analisiGlobale', 'analisiMensile', 'dettagliOperatori', 'dettagliServizi', 'suggerimenti'].map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`block w-full text-left px-4 py-2 ${activeSection === section ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
            >
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenuto principale */}
      <div className="flex-1 p-4 md:p-10 overflow-y-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-8">Dashboard Salone di Parrucchieri</h1>
        
        <div {...getRootProps()} className="mb-8 p-4 md:p-6 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-500 transition-colors">
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Rilascia i file qui...</p>
          ) : (
            <p>Trascina e rilascia i file Excel qui, oppure clicca per selezionare i file</p>
          )}
        </div>

        {isLoading && <p className="text-center">Caricamento in corso...</p>}

        {Object.keys(monthlyData).length > 0 && analysis && (
          <div>
            {activeSection === 'panoramica' && renderPanoramica()}
            {activeSection === 'analisiGlobale' && renderAnalisiGlobale()}
            {activeSection === 'analisiMensile' && renderAnalisiMensile()}
            {activeSection === 'dettagliOperatori' && renderDettagliOperatori()}
            {activeSection === 'dettagliServizi' && renderDettagliServizi()}
            {activeSection === 'suggerimenti' && renderSuggerimenti()}
          </div>
        )}

        {Object.keys(monthlyData).length === 0 && !isLoading && (
          <p className="mt-8 text-gray-600">Carica uno o più file Excel per visualizzare l'analisi dei dati.</p>
        )}
      </div>
    </div>
  );
};

export default App;
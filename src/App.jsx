
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

function getDaysInMonth(year, month) {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function formatDate(date) {
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatWeekday(date) {
  return date.toLocaleDateString("de-DE", { weekday: "short" });
}

const printStyle = `
  @media print {
    body * {
      visibility: hidden;
    }
    .print-area, .print-area * {
      visibility: visible;
      font-size: 8pt !important;
      font-family: Arial !important;
    }
    .print-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    @page {
      size: A4;
      margin: 0;
    }
  }
`;

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [clients, setClients] = useState([]);
  const [entries, setEntries] = useState([]);
  const [entry, setEntry] = useState({ client: "", date: "", service: "", timeFrom: "", timeTo: "", minutes: "" });
  const [newClient, setNewClient] = useState({ name: "", birthdate: "", address: "", provider: "", hours: "" });

  useEffect(() => {
    if (entry.timeFrom && entry.timeTo) {
      const [h1, m1] = entry.timeFrom.split(":").map(Number);
      const [h2, m2] = entry.timeTo.split(":").map(Number);
      const total = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (!isNaN(total) && total > 0) {
        setEntry(prev => ({ ...prev, minutes: total.toString() }));
      }
    }
  }, [entry.timeFrom, entry.timeTo]);

  const selectedDate = entries.length > 0 ? new Date(entries[0].date) : new Date();
  const daysInMonth = getDaysInMonth(selectedDate.getFullYear(), selectedDate.getMonth());

  const inputStyle = { width: "100%", padding: "8px", margin: "6px 0", fontSize: "12pt", fontFamily: "Arial" };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(entries);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leistungsnachweis");
    XLSX.writeFile(wb, "Leistungsnachweis.xlsx");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Kopfdaten und Grundlayout
    const currentClient = clients.find(c => c.name === entry.client);
    const clientInfo = currentClient ? `${currentClient.name} – ${currentClient.birthdate} – ${currentClient.address}` : "Keine Daten";

    doc.setFont("Arial", "normal");
    doc.setFontSize(8);
    doc.text("Anlage 2 - Leistungsnachweis", 10, 10);
    doc.text(`Betreuungsnachweis für ambulant betreutes Wohnen`, 10, 15);
    doc.text(`Leistungserbringer: ${clientInfo}`, 10, 20);

    // Tabelle
    doc.autoTable({
      startY: 25,
      head: [["WT", "Datum", "Betreuungsinhalt", "Std./Min", "Unterschrift"]],
      body: entries.map((entry) => [
        formatWeekday(new Date(entry.date)),
        formatDate(new Date(entry.date)),
        entry.service,
        entry.minutes,
        ""
      ]),
      theme: "striped",
      styles: { fontSize: 8, font: "Arial" }
    });

    doc.text("Unterschrift des Betreuten:", 10, doc.lastAutoTable.finalY + 5);
    doc.text("Unterschrift des Mitarbeiters:", 10, doc.lastAutoTable.finalY + 10);

    // Speichern als PDF
    doc.save("Leistungsnachweis.pdf");
  };

  if (!loggedIn) {
    return (
      <div style={{ maxWidth: 400, margin: "auto", padding: 20, fontFamily: "Arial" }}>
        <h2>🔐 Anmeldung</h2>
        <input placeholder="Benutzername" value={username} onChange={e => setUsername(e.target.value)} style={inputStyle} />
        <input type="password" placeholder="Passwort" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
        <button onClick={() => setLoggedIn(true)} style={{ ...inputStyle, backgroundColor: '#007bff', color: 'white' }}>Anmelden</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "auto", padding: 20, fontFamily: "Arial" }}>
      <h2>📋 Leistungsdokumentation</h2>

      <h3>👤 Klient:in anlegen</h3>
      {Object.entries(newClient).map(([key, val]) => (
        <input key={key} placeholder={key} value={val} onChange={e => setNewClient({ ...newClient, [key]: e.target.value })} style={inputStyle} />
      ))}
      <button onClick={() => setClients([...clients, newClient])} style={inputStyle}>Speichern</button>

      <h3>📝 Leistung erfassen</h3>
      <select value={entry.client} onChange={e => setEntry({ ...entry, client: e.target.value })} style={inputStyle}>
        <option value="">-- Klient:in auswählen --</option>
        {clients.map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
      </select>
      <input type="date" value={entry.date} onChange={e => setEntry({ ...entry, date: e.target.value })} style={inputStyle} />
      <input placeholder="Leistung" value={entry.service} onChange={e => setEntry({ ...entry, service: e.target.value })} style={inputStyle} />
      <input type="time" value={entry.timeFrom} onChange={e => setEntry({ ...entry, timeFrom: e.target.value })} style={inputStyle} />
      <input type="time" value={entry.timeTo} onChange={e => setEntry({ ...entry, timeTo: e.target.value })} style={inputStyle} />
      <input type="number" placeholder="Minuten" value={entry.minutes} onChange={e => setEntry({ ...entry, minutes: e.target.value })} style={inputStyle} />
      <button onClick={() => setEntries([...entries, entry])} style={inputStyle}>Eintrag speichern</button>

      <h3>📄 Einträge</h3>
      <ul>
        {entries.map((e, i) => (
          <li key={i}>{e.date} – {e.client} – {e.service} – {e.minutes} Minuten</li>
        ))}
      </ul>

      <h3>📄 Auswertung</h3>
      <div className="print-area">
        <p><strong>Anlage 2 - Leistungsnachweis</strong></p>
        <p>Betreuungsnachweis für ambulant betreutes Wohnen</p>
        {(() => {
          const currentClient = clients.find(c => c.name === entry.client);
          return currentClient ? (
            <div style={{ marginBottom: "1rem" }}>
              <p><strong>Leistungserbringer:</strong></p>
              <p><strong>Name, Vorname:</strong> {currentClient.name} &nbsp;&nbsp;&nbsp; <strong>geb. am:</strong> {currentClient.birthdate}</p>
              <p><strong>wohnhaft in:</strong> {currentClient.address}</p>
              <p><strong>Monat:</strong> {selectedDate.toLocaleDateString("de-DE", { month: "short", year: "2-digit" })} &nbsp;&nbsp;&nbsp; <strong>Betr.Std./Wo.:</strong> {currentClient.hours}</p>
            </div>
          ) : null;
        })()}

        <table style={{ width: "100%", borderCollapse: "collapse" }} border="1">
          <thead>
            <tr>
              <th>WT</th>
              <th>Datum</th>
              <th>Betreuungsinhalt</th>
              <th>Std./Min</th>
              <th>Unterschrift</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let weekRows = [];
              let currentWeek = [];
              let totalMinutes = 0;
              let grandTotal = 0;

              const entriesByDate = {};
              entries.forEach(e => {
                entriesByDate[e.date] = entriesByDate[e.date] || [];
                entriesByDate[e.date].push(e);
              });

              for (let i = 0; i < daysInMonth.length; i++) {
                const day = daysInMonth[i];
                const isoDate = day.toISOString().split('T')[0];
                const matchingEntries = entriesByDate[isoDate] || [];

                if (matchingEntries.length > 0) {
                  matchingEntries.forEach((entry, idx) => {
                    currentWeek.push(
                      <tr key={`${isoDate}-${idx}`}>
                        <td>{formatWeekday(day)}</td>
                        <td>{formatDate(day)}</td>
                        <td>{entry.service}</td>
                        <td>{entry.minutes}</td>
                        <td></td>
                      </tr>
                    );
                    totalMinutes += parseInt(entry.minutes);
                  });
                } else {
                  currentWeek.push(
                    <tr key={`${isoDate}-empty`}>
                      <td>{formatWeekday(day)}</td>
                      <td>{formatDate(day)}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  );
                }

                if (day.getDay() === 0 || i === daysInMonth.length - 1) {
                  currentWeek.push(
                    <tr key={`week-sum-${i}`}>
                      <td colSpan="3"><strong>Wochenstunden gesamt</strong></td>
                      <td><strong>{(totalMinutes / 60).toFixed(2)}</strong></td>
                      <td></td>
                    </tr>
                  );
                  grandTotal += totalMinutes;
                  totalMinutes = 0;
                  weekRows.push(...currentWeek);
                  currentWeek = [];
                }
              }

              weekRows.push(
                <tr key="grand-total">
                  <td colSpan="3"><strong>Gesamtstunden</strong></td>
                  <td><strong>{(grandTotal / 60).toFixed(2)}</strong></td>
                  <td></td>
                </tr>
              );

              return weekRows;
            })()}
          </tbody>
        </table>

        <p style={{ marginTop: "2rem" }}>Datum/ Unterschrift des Betreuten:</p>
        <input type="text" placeholder="Unterschrift Klient:in" style={{ width: "100%", fontSize: "8pt", fontFamily: "Arial", border: "1px solid #000", padding: "4px", marginTop: "4px" }} />
        <p style={{ marginTop: "1rem" }}>Unterschrift Mitarbeiter:in:</p>
        <input type="text" placeholder="Unterschrift Mitarbeiter:in" style={{ width: "100%", fontSize: "8pt", fontFamily: "Arial", border: "1px solid #000", padding: "4px", marginTop: "4px" }} />
      </div>

      <button onClick={handlePrint} style={{ ...inputStyle, backgroundColor: '#28a745', color: 'white' }}>Drucken</button>
      <button onClick={handleExportExcel} style={{ ...inputStyle, backgroundColor: '#007bff', color: 'white' }}>Exportieren als Excel</button>
      <button onClick={handleExportPDF} style={{ ...inputStyle, backgroundColor: '#ff5733', color: 'white' }}>Exportieren als PDF</button>
    </div>
  );
}

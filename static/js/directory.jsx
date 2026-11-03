const { useEffect, useMemo, useState } = React;

function SearchBar({ query, onQueryChange, species, onSpeciesChange, speciesOptions, resultCount }) {
  return (
    <section className="row g-3 align-items-end mb-3" aria-label="Patient search and filters">
      <div className="col-md-6">
        <label className="form-label" htmlFor="patientSearch">Search pet or owner</label>
        <input
          id="patientSearch"
          type="search"
          className="form-control"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Enter a pet or owner name"
        />
      </div>
      <div className="col-md-3">
        <label className="form-label" htmlFor="speciesFilter">Species</label>
        <select
          id="speciesFilter"
          className="form-select"
          value={species}
          onChange={(event) => onSpeciesChange(event.target.value)}
        >
          <option value="All">All species</option>
          {speciesOptions.map((speciesName) => (
            <option key={speciesName} value={speciesName}>{speciesName}</option>
          ))}
        </select>
      </div>
      <div className="col-md-3">
        <p className="mb-2 text-muted" aria-live="polite">{resultCount} {resultCount === 1 ? 'patient' : 'patients'} found</p>
      </div>
    </section>
  );
}

function PatientRow({ patient, selected, onSelect }) {
  return (
    <tr className={selected ? 'table-primary' : ''}>
      <th scope="row">
        <div className="d-flex align-items-center gap-2">
          {patient.photo_path ? (
            <a href={`/patients/${patient.id}`}>
              <img
                className="patient-photo-thumbnail"
                src={`/api/patients/${patient.id}/photo`}
                alt={`Thumbnail photo of ${patient.pet_name}`}
              />
            </a>
          ) : (
            <span className="patient-photo-placeholder" aria-hidden="true">No photo</span>
          )}
          <a href={`/patients/${patient.id}`}>{patient.pet_name}</a>
        </div>
      </th>
      <td>{patient.species}</td>
      <td>{patient.breed || 'Not specified'}</td>
      <td>{patient.owner_name}<br /><span className="text-muted">{patient.phone}</span></td>
      <td>{patient.visitCount}</td>
      <td>{patient.lastVisit || 'No visits'}</td>
      <td>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          aria-pressed={selected}
          aria-label={`${selected ? 'Hide' : 'Show'} visit history for ${patient.pet_name}`}
          onClick={() => onSelect(patient.id)}
        >
          {selected ? 'Hide history' : 'Visit history'}
        </button>
      </td>
    </tr>
  );
}

function PatientTable({ patients, selectedPatientId, onSelectPatient }) {
  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <caption className="visually-hidden">Patients, owners, visit counts, and most recent visit dates</caption>
        <thead>
          <tr>
            <th scope="col">Pet Name</th>
            <th scope="col">Species</th>
            <th scope="col">Breed</th>
            <th scope="col">Owner / Phone</th>
            <th scope="col">Visits</th>
            <th scope="col">Last Visit</th>
            <th scope="col"><span className="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {patients.length ? patients.map((patient) => (
            <PatientRow
              key={patient.id}
              patient={patient}
              selected={String(patient.id) === String(selectedPatientId)}
              onSelect={onSelectPatient}
            />
          )) : (
            <tr><td colSpan="7" className="text-muted text-center py-4">No patients match these filters.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function VisitHistory({ patient, onClose }) {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!patient) {
      setVisits([]);
      setError('');
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    setError('');
    window.PawCareApi.getPatientVisits(patient.id)
      .then((data) => {
        if (active) setVisits(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Visit history could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [patient?.id]);

  if (!patient) return null;

  return (
    <section className="mt-4 border-top pt-3" aria-labelledby="visitHistoryTitle">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h2 className="h5 mb-0" id="visitHistoryTitle">Visit history: {patient.pet_name}</h2>
        <div className="d-flex gap-2">
          <a className="btn btn-sm btn-primary" href={`/visits?patient=${encodeURIComponent(patient.id)}`}>Record visit</a>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>Close history</button>
        </div>
      </div>
      {loading && <p className="text-muted" role="status">Loading visit history...</p>}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {!loading && !error && visits.length === 0 && <p className="text-muted">No visits recorded for this patient.</p>}
      {!loading && !error && visits.length > 0 && (
        <ul className="list-group list-group-flush">
          {visits.map((visit) => (
            <li className="list-group-item px-0" key={visit.id}>
              <div className="d-flex flex-wrap justify-content-between gap-2">
                <strong>{visit.date} at {visit.time}</strong>
                <span className="badge text-bg-primary rounded-pill">{visit.visit_type}</span>
              </div>
              {visit.notes && <p className="mb-0 mt-1 text-muted">{visit.notes}</p>}
              <small className="text-muted">Recorded by {visit.staff_name}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PatientDirectory() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('All');
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  useEffect(() => {
    let active = true;
    window.PawCareApi.getPatients()
      .then((data) => {
        if (active) setPatients(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'The patient directory could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const speciesOptions = useMemo(
    () => [...new Set(patients.map((patient) => patient.species))].sort(),
    [patients],
  );
  const filteredPatients = useMemo(() => {
    const searchTerm = query.trim().toLocaleLowerCase();
    return patients.filter((patient) => {
      const matchesSpecies = speciesFilter === 'All' || patient.species === speciesFilter;
      const matchesSearch = !searchTerm
        || patient.pet_name.toLocaleLowerCase().includes(searchTerm)
        || patient.owner_name.toLocaleLowerCase().includes(searchTerm);
      return matchesSpecies && matchesSearch;
    });
  }, [patients, query, speciesFilter]);
  const selectedPatient = patients.find((patient) => String(patient.id) === String(selectedPatientId)) || null;

  function selectPatient(patientId) {
    setSelectedPatientId((currentId) => String(currentId) === String(patientId) ? null : patientId);
  }

  return (
    <div>
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        species={speciesFilter}
        onSpeciesChange={setSpeciesFilter}
        speciesOptions={speciesOptions}
        resultCount={filteredPatients.length}
      />
      {loading && <p className="text-muted" role="status">Loading patients...</p>}
      {!loading && error && <div className="alert alert-danger" role="alert">{error}</div>}
      {!loading && !error && (
        <>
          <PatientTable
            patients={filteredPatients}
            selectedPatientId={selectedPatientId}
            onSelectPatient={selectPatient}
          />
          <VisitHistory patient={selectedPatient} onClose={() => setSelectedPatientId(null)} />
        </>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('directory-root'));
root.render(<PatientDirectory />);

import { useState } from "react";
import axios from "axios";
import { Link, Navigate } from "react-router-dom";

export default function RegisterGuidePage() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [idProof, setIdProof] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [languages, setLanguages] = useState('');
  const [places, setPlaces] = useState('');
  const [redirect, setRedirect] = useState(false);

  async function handleRegisterSubmit(ev) {
    ev.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('contact', contact);
    formData.append('email', email);
    formData.append('idProof', idProof);
    formData.append('profilePhoto', profilePhoto);
    formData.append('languages', languages);
    formData.append('places', places);

    try {
      await axios.post('http://localhost:4000/api/register-guide', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('Registration successful');
      setRedirect(true);
    } catch (e) {
      alert('Registration failed');
    }
  }

  if (redirect) {
    return <Navigate to={'/'} />
  }

  return (
    <div className="mt-4 grow flex items-center justify-around">
      <div className="mb-64">
        <br></br>
        <h1 className="text-4xl text-center mb-4">Register as a Guide</h1>
        <form className="max-w-md mx-auto" onSubmit={handleRegisterSubmit}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={ev => setName(ev.target.value)}
          />
          <input
            type="text"
            placeholder="Contact info"
            value={contact}
            onChange={ev => setContact(ev.target.value)}
          />
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={ev => setEmail(ev.target.value)}
          />
          Add your ID-proof:   <input
            type="file"
            onChange={ev => setIdProof(ev.target.files[0])}
          />
          <br></br>
          Add a profile photo:   <input
            type="file"
            onChange={ev => setProfilePhoto(ev.target.files[0])}
          />
          <input
            type="text"
            placeholder="Languages you know (comma separated)"
            value={languages}
            onChange={ev => setLanguages(ev.target.value)}
          />
          <input
            type="text"
            placeholder="Places you can introduce (comma separated)"
            value={places}
            onChange={ev => setPlaces(ev.target.value)}
          />
          <button className="primary">Register</button>
        </form>
      </div>
    </div>
  );
}

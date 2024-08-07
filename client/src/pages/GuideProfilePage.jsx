import { useState, useEffect } from "react";
import axios from "axios";
import { Navigate } from "react-router-dom";

export default function GuideProfilePage() {
  const [guide, setGuide] = useState(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [idProof, setIdProof] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [languages, setLanguages] = useState('');
  const [places, setPlaces] = useState('');
  const [redirect, setRedirect] = useState(false);

  useEffect(() => {
    async function fetchGuide() {
      try {
        const { data } = await axios.get('http://localhost:4000/api/guide-profile');
        setGuide(data);
        setName(data.name);
        setContact(data.contact);
        setEmail(data.email);
        setLanguages(data.languages.join(', '));
        setPlaces(data.places.join(', '));
      } catch (e) {
        console.error('Failed to fetch guide data', e);
      }
    }
    fetchGuide();
  }, []);

  async function handleUpdateSubmit(ev) {
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
      await axios.post('http://localhost:4000/api/update-guide', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('Update successful');
      setRedirect(true);
    } catch (e) {
      alert('Update failed');
    }
  }

  if (redirect) {
    return <Navigate to={'/'} />
  }

  if (!guide) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mt-4 grow flex items-center justify-around">
      <div className="mb-64">
        <h1 className="text-4xl text-center mb-4">Guide Profile</h1>
        <div className="text-center">
          <img src={guide.profilePhoto} alt="Profile" className="rounded-full w-32 h-32 mx-auto mb-4" />
        </div>
        <form className="max-w-md mx-auto" onSubmit={handleUpdateSubmit}>
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
          Update your ID-proof: <input
            type="file"
            onChange={ev => setIdProof(ev.target.files[0])}
          />
          <br></br>
          Update profile photo: <input
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
          <button className="primary">Update</button>
        </form>
      </div>
    </div>
  );
}

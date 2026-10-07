import React from 'react';
import { BriefcaseMedical, Clock3 } from 'lucide-react';
import { Avatar, money } from './UI';
export default function DoctorCard({ doctor, onBook, onProfile }) {
  return (
    <article className="doctor-card">
      <div className="doctor-top">
        <Avatar doctor={doctor} />
        <div>
          <button className="name-link" onClick={() => onProfile(doctor)}>
            {doctor.name}
          </button>
          <p className="specialty">{doctor.specialty}</p>
          <p className="qualification">{doctor.qualification}</p>
        </div>
      </div>
      <div className="doctor-meta">
        <span>
          <BriefcaseMedical size={15} />
          {doctor.experience} years experience
        </span>
        <span>
          <Clock3 size={15} />
          30 min consultation
        </span>
      </div>
      <div className="doctor-bottom">
        <div>
          <strong>{money(doctor.fee)}</strong>
          <span> / visit</span>
        </div>
        <button className="button subtle" onClick={() => onBook(doctor)}>
          View availability
        </button>
      </div>
    </article>
  );
}

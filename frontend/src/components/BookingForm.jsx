import React, { useState, useEffect } from 'react';
import { FaSearch, FaCalendar, FaClock, FaCheck } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import bookingService from '../services/bookingService';
import organizationService from '../services/organizationService';

const BookingForm = () => {
  const [step, setStep] = useState(1);
  const [organizations, setOrganizations] = useState([]);
  const [filteredOrgs, setFilteredOrgs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = organizations.filter(org => 
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOrgs(filtered);
    } else {
      setFilteredOrgs(organizations);
    }
  }, [searchTerm, organizations]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const data = await organizationService.getActiveOrganizations();
      setOrganizations(data);
      setFilteredOrgs(data);
    } catch (err) {
      setError('Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedOrg || !selectedDate) return;
    
    try {
      setLoading(true);
      const formattedDate = selectedDate.toISOString().split('T')[0];
      const data = await organizationService.getTimeslots(selectedOrg.id, formattedDate);
      setAvailableSlots(data);
    } catch (err) {
      setError('Failed to fetch available slots');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOrg || !selectedDate || !selectedSlot) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const bookingData = {
        organizationId: selectedOrg.id,
        date: selectedDate.toISOString().split('T')[0],
        timeslotId: selectedSlot.id
      };
      
      await bookingService.createBooking(bookingData);
      // Reset form and show success message
      setStep(1);
      setSelectedOrg(null);
      setSelectedDate(new Date());
      setSelectedSlot(null);
      setError('');
      alert('Booking created successfully!');
    } catch (err) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  // ... rest of the existing code (render methods) ...
}; 
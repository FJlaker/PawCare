(() => {
    const defaultPatients = [
        {
            id: 1,
            pet_name: 'Bella',
            species: 'Dog',
            breed: 'Labrador',
            dob: '2022-04-12',
            gender: 'Female',
            neutered_spayed: true,
            owner_name: 'Sarah Johnson',
            email: 'sarah@example.com',
            phone: '0412345678',
        },
        {
            id: 2,
            pet_name: 'Milo',
            species: 'Cat',
            breed: 'Tabby',
            dob: '2021-02-15',
            gender: 'Male',
            neutered_spayed: true,
            owner_name: 'Daniel Lee',
            email: 'daniel@example.com',
            phone: '0400123456',
        },
        {
            id: 3,
            pet_name: 'Luna',
            species: 'Rabbit',
            breed: 'Mini Lop',
            dob: '2023-11-04',
            gender: 'Female',
            neutered_spayed: false,
            owner_name: 'Priya Nair',
            email: 'priya@example.com',
            phone: '0712345678',
        },
        {
            id: 4,
            pet_name: 'Oscar',
            species: 'Bird',
            breed: 'Cockatiel',
            dob: '2020-08-18',
            gender: 'Male',
            neutered_spayed: false,
            owner_name: 'Aiden Smith',
            email: 'aiden@example.com',
            phone: '0823456789',
        },
        {
            id: 5,
            pet_name: 'Daisy',
            species: 'Dog',
            breed: 'Beagle',
            dob: '2019-10-02',
            gender: 'Female',
            neutered_spayed: true,
            owner_name: 'Karen Walker',
            email: 'karen@example.com',
            phone: '0834567890',
        },
        {
            id: 6,
            pet_name: 'Pip',
            species: 'Other',
            breed: 'Guinea Pig',
            dob: '2024-01-29',
            gender: 'Male',
            neutered_spayed: false,
            owner_name: 'Theo van der Merwe',
            email: 'theo@example.com',
            phone: '0798765432',
        },
    ];

    const defaultVisits = [
        { id: 1, patient_id: 1, pet_name: 'Bella', owner_name: 'Sarah Johnson', visit_type: 'Annual checkup', date: '2026-07-05', time: '09:30', notes: 'Routine wellness check.', staff_name: 'Riley Quinn' },
        { id: 2, patient_id: 2, pet_name: 'Milo', owner_name: 'Daniel Lee', visit_type: 'Vaccination booster', date: '2026-07-07', time: '11:00', notes: 'Vaccination review complete.', staff_name: 'Riley Quinn' },
        { id: 3, patient_id: 3, pet_name: 'Luna', owner_name: 'Priya Nair', visit_type: 'Consultation', date: '2026-07-09', time: '14:00', notes: 'Diet follow-up.', staff_name: 'Jamie Clarke' },
        { id: 4, patient_id: 4, pet_name: 'Oscar', owner_name: 'Aiden Smith', visit_type: 'Emergency', date: '2026-07-11', time: '08:15', notes: 'Wing check after injury.', staff_name: 'Jamie Clarke' },
        { id: 5, patient_id: 5, pet_name: 'Daisy', owner_name: 'Karen Walker', visit_type: 'Surgery follow-up', date: '2026-07-13', time: '15:30', notes: 'Healing well.', staff_name: 'Riley Quinn' },
        { id: 6, patient_id: 6, pet_name: 'Pip', owner_name: 'Theo van der Merwe', visit_type: 'Spay/Neuter', date: '2026-07-14', time: '10:45', notes: 'Post-op check.', staff_name: 'Jamie Clarke' },
        { id: 7, patient_id: 1, pet_name: 'Bella', owner_name: 'Sarah Johnson', visit_type: 'Consultation', date: '2026-08-02', time: '13:15', notes: 'Skin irritation review.', staff_name: 'Riley Quinn' },
        { id: 8, patient_id: 2, pet_name: 'Milo', owner_name: 'Daniel Lee', visit_type: 'Consultation', date: '2026-08-08', time: '10:00', notes: 'General check-in.', staff_name: 'Jamie Clarke' },
        { id: 9, patient_id: 3, pet_name: 'Luna', owner_name: 'Priya Nair', visit_type: 'Annual checkup', date: '2026-08-11', time: '09:00', notes: 'Teeth and coat review.', staff_name: 'Riley Quinn' },
        { id: 10, patient_id: 4, pet_name: 'Oscar', owner_name: 'Aiden Smith', visit_type: 'Vaccination booster', date: '2026-08-15', time: '16:20', notes: 'Vaccinated successfully.', staff_name: 'Jamie Clarke' },
        { id: 11, patient_id: 5, pet_name: 'Daisy', owner_name: 'Karen Walker', visit_type: 'Annual checkup', date: '2026-08-18', time: '12:45', notes: 'Healthy and active.', staff_name: 'Jamie Clarke' },
        { id: 12, patient_id: 6, pet_name: 'Pip', owner_name: 'Theo van der Merwe', visit_type: 'Consultation', date: '2026-08-21', time: '15:00', notes: 'Feeding adjustment.', staff_name: 'Riley Quinn' },
        { id: 13, patient_id: 1, pet_name: 'Bella', owner_name: 'Sarah Johnson', visit_type: 'Emergency', date: '2026-09-01', time: '18:10', notes: 'Minor limp observed.', staff_name: 'Jamie Clarke' },
        { id: 14, patient_id: 2, pet_name: 'Milo', owner_name: 'Daniel Lee', visit_type: 'Spay/Neuter', date: '2026-09-05', time: '12:00', notes: 'Post-op follow-up.', staff_name: 'Riley Quinn' },
        { id: 15, patient_id: 3, pet_name: 'Luna', owner_name: 'Priya Nair', visit_type: 'Surgery follow-up', date: '2026-09-08', time: '11:30', notes: 'Eating well.', staff_name: 'Jamie Clarke' },
        { id: 16, patient_id: 4, pet_name: 'Oscar', owner_name: 'Aiden Smith', visit_type: 'Consultation', date: '2026-09-09', time: '09:45', notes: 'Feather condition review.', staff_name: 'Riley Quinn' },
        { id: 17, patient_id: 5, pet_name: 'Daisy', owner_name: 'Karen Walker', visit_type: 'Emergency', date: '2026-09-12', time: '07:30', notes: 'Digestive upset.', staff_name: 'Jamie Clarke' },
        { id: 18, patient_id: 6, pet_name: 'Pip', owner_name: 'Theo van der Merwe', visit_type: 'Annual checkup', date: '2026-09-18', time: '09:00', notes: 'General wellness.', staff_name: 'Riley Quinn' },
        { id: 19, patient_id: 1, pet_name: 'Bella', owner_name: 'Sarah Johnson', visit_type: 'Vaccination booster', date: '2026-09-20', time: '10:10', notes: 'Booster received.', staff_name: 'Jamie Clarke' },
        { id: 20, patient_id: 2, pet_name: 'Milo', owner_name: 'Daniel Lee', visit_type: 'Annual checkup', date: '2026-09-25', time: '09:30', notes: 'Healthy coat and weight.', staff_name: 'Riley Quinn' },
        { id: 21, patient_id: 3, pet_name: 'Luna', owner_name: 'Priya Nair', visit_type: 'Consultation', date: '2026-09-27', time: '14:45', notes: 'Improved exercise.', staff_name: 'Jamie Clarke' },
        { id: 22, patient_id: 4, pet_name: 'Oscar', owner_name: 'Aiden Smith', visit_type: 'Emergency', date: '2026-09-29', time: '08:00', notes: 'Check for stress behaviour.', staff_name: 'Riley Quinn' },
        { id: 23, patient_id: 5, pet_name: 'Daisy', owner_name: 'Karen Walker', visit_type: 'Vaccination booster', date: '2026-09-30', time: '12:15', notes: 'All vaccinations up to date.', staff_name: 'Jamie Clarke' },
        { id: 24, patient_id: 6, pet_name: 'Pip', owner_name: 'Theo van der Merwe', visit_type: 'Consultation', date: '2026-10-01', time: '09:20', notes: 'Behaviour review.', staff_name: 'Riley Quinn' },
        { id: 25, patient_id: 1, pet_name: 'Bella', owner_name: 'Sarah Johnson', visit_type: 'Surgery follow-up', date: '2026-10-04', time: '15:10', notes: 'Recovery is on track.', staff_name: 'Jamie Clarke' },
        { id: 26, patient_id: 2, pet_name: 'Milo', owner_name: 'Daniel Lee', visit_type: 'Consultation', date: '2026-10-06', time: '10:50', notes: 'Monitoring appetite.', staff_name: 'Riley Quinn' },
        { id: 27, patient_id: 3, pet_name: 'Luna', owner_name: 'Priya Nair', visit_type: 'Vaccination booster', date: '2026-10-08', time: '11:15', notes: 'Vaccination completed.', staff_name: 'Jamie Clarke' },
        { id: 28, patient_id: 4, pet_name: 'Oscar', owner_name: 'Aiden Smith', visit_type: 'Annual checkup', date: '2026-10-10', time: '09:10', notes: 'Behaviour and plumage check.', staff_name: 'Riley Quinn' },
        { id: 29, patient_id: 5, pet_name: 'Daisy', owner_name: 'Karen Walker', visit_type: 'Consultation', date: '2026-10-11', time: '08:45', notes: 'General wellness call.', staff_name: 'Jamie Clarke' },
        { id: 30, patient_id: 6, pet_name: 'Pip', owner_name: 'Theo van der Merwe', visit_type: 'Emergency', date: '2026-10-14', time: '18:00', notes: 'Minor bruising observed.', staff_name: 'Riley Quinn' },
    ];

    function initializeSeedData() {
        if (!window.PawCareStorage) {
            return;
        }

        const patients = window.PawCareStorage.getPatients();
        if (!patients.length) {
            window.PawCareStorage.savePatients(defaultPatients);
        }

        const visits = window.PawCareStorage.getVisits();
        if (!visits.length) {
            window.PawCareStorage.saveVisits(defaultVisits);
        }
    }

    window.PawCareSeedData = {
        defaultPatients,
        defaultVisits,
        initializeSeedData,
    };

    document.addEventListener('DOMContentLoaded', () => {
        initializeSeedData();
    });
})();

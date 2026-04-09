const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SECRET_KEY = "ecs_super_secret_key";
const db = new sqlite3.Database(':memory:'); 

db.serialize(() => {
    // Create Tables
    db.run(`CREATE TABLE Users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, password TEXT, role TEXT)`);
    db.run(`CREATE TABLE Classrooms (id INTEGER PRIMARY KEY, room_number TEXT, capacity INTEGER, facilities TEXT)`);
    db.run(`CREATE TABLE Timetable (id INTEGER PRIMARY KEY, room_id INTEGER, day TEXT, time_slot TEXT, subject TEXT)`);
    db.run(`CREATE TABLE Bookings (id INTEGER PRIMARY KEY, user_id INTEGER, room_id INTEGER, date TEXT, time_slot TEXT)`);

    // Seed Data - Users
    db.run(`INSERT INTO Users (name, email, password, role) VALUES ('System Admin', 'admin@ecs.com', 'pass123', 'admin'), ('Dr. Smith', 'smith@ecs.com', 'pass123', 'faculty')`);
    
    // Seed Data - 5 Classrooms
    db.run(`INSERT INTO Classrooms (room_number, capacity, facilities) VALUES ('A101', 30, 'Projector'), ('A102', 40, 'None'), ('B201', 50, 'Projector'), ('B202', 60, 'None'), ('C301', 30, 'Projector')`);

    // --- REALISTIC 8AM-4PM TIMETABLE ---
    // This ensures at least one room is free every hour
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    days.forEach(day => {
        // A101: Occupied 8am-2pm (Free 2pm-4pm)
        db.run(`INSERT INTO Timetable (room_id, day, time_slot, subject) VALUES (1, '${day}', '08:00-14:00', 'Cyber Security')`);
        // A102: Occupied 8am-10am & 12pm-4pm (Free 10am-12pm)
        db.run(`INSERT INTO Timetable (room_id, day, time_slot, subject) VALUES (2, '${day}', '08:00-10:00', 'Data Structures')`);
        db.run(`INSERT INTO Timetable (room_id, day, time_slot, subject) VALUES (2, '${day}', '12:00-16:00', 'Data Structures')`);
        // B201: Occupied 8am-12pm & 2pm-4pm (Free 12pm-2pm)
        db.run(`INSERT INTO Timetable (room_id, day, time_slot, subject) VALUES (3, '${day}', '08:00-12:00', 'Operating Systems')`);
        db.run(`INSERT INTO Timetable (room_id, day, time_slot, subject) VALUES (3, '${day}', '14:00-16:00', 'Operating Systems')`);
        // B202: Occupied 10am-4pm (Free 8am-10am)
        db.run(`INSERT INTO Timetable (room_id, day, time_slot, subject) VALUES (4, '${day}', '10:00-16:00', 'Software Eng.')`);
        // C301: Occupied 8am-10am & 12pm-4pm (Free 10am-12pm)
        db.run(`INSERT INTO Timetable (room_id, day, time_slot, subject) VALUES (5, '${day}', '08:00-10:00', 'AI & ML')`);
        db.run(`INSERT INTO Timetable (room_id, day, time_slot, subject) VALUES (5, '${day}', '12:00-16:00', 'AI & ML')`);
    });
});

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Forbidden" });
        req.user = user;
        next();
    });
};

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM Users WHERE email = ? AND password = ?`, [email, password], (err, user) => {
        if (!user) return res.status(401).json({ error: "Invalid credentials" });
        const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET_KEY, { expiresIn: '2h' });
        res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
    });
});

app.get('/api/classrooms', authenticate, (req, res) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const currentDay = days[now.getDay()];
    const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    const currentDate = now.toISOString().split('T')[0];

    const query = `
        SELECT c.*, 
        (SELECT COUNT(*) FROM Timetable t WHERE t.room_id = c.id AND t.day = ? AND ? BETWEEN SUBSTR(t.time_slot, 1, 5) AND SUBSTR(t.time_slot, 7, 5)) as in_timetable,
        (SELECT COUNT(*) FROM Bookings b WHERE b.room_id = c.id AND b.date = ? AND ? BETWEEN SUBSTR(b.time_slot, 1, 5) AND SUBSTR(b.time_slot, 7, 5)) as is_booked
        FROM Classrooms c
    `;

    db.all(query, [currentDay, currentTime, currentDate, currentTime], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const classroomsWithStatus = rows.map(room => ({
            ...room,
            status: (room.in_timetable > 0 || room.is_booked > 0) ? 'Occupied' : 'Available'
        }));
        res.json(classroomsWithStatus);
    });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(5000, () => console.log('ECS Server running on http://localhost:5000'));
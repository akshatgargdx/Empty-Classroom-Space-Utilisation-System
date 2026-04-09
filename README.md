A full-stack web application designed to optimize classroom usage within educational institutions. The system addresses the challenge of finding available study spaces and managing classroom bookings in real-time by synchronizing university timetables with a live dashboard.

Key Features:

Live Availability Dashboard: Real-time tracking of 5+ classrooms using a dynamic "Occupied vs. Available" status engine.

Time-Synced Logic: Automatic status updates based on integrated 8 AM - 4 PM college timetables.

Secure Authentication: Protected routes and user sessions implemented using JSON Web Tokens (JWT).

Three-Tier Architecture: Built with a React frontend, Node.js/Express backend, and a relational SQLite database.


Start it up: node server.js

To stop the process, run the fix command (to ensure port 5000 is clean):
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force


To install npm

cd ecs-project
npm install
npm start


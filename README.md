# Introduction

My PKM app enables the storage, structuring, and retrieval of information and knowledge. It supports text, images, internal links, code blocks, tags and search. Ideal for learning, research, work procedures, and personal note structuring. Built with Spring Boot 3.3 and React 18. Elasticsearch implementation is planned.

# Screenshots
 
![pkms](https://github.com/user-attachments/assets/addaff38-5217-4da2-abe2-160d287270c7)
  
 
    
![image](https://github.com/user-attachments/assets/60354985-52b5-4040-93eb-a172805e9949)
 
  
![image](https://github.com/user-attachments/assets/99c0c40c-20dd-42cf-bb17-23a78f8fc886)
 
 

# Installing a development server (Windows)

I'll walk you through setting up both the backend and frontend server on a Windows machine.
You'll have a fully functional PKM app ready for use or for development.

## Prerequisites

This guide assumes a clean Windows installation. We will be using the Chocolatey package manager. If you don't have Chocolatey installed, follow the instructions on the [Chocolatey installation page](https://chocolatey.org/install).

### Step 1: Install Required Software

Open PowerShell as an Administrator and run the following commands to install the necessary software:

```powershell
choco install openjdk --version=21.0.2 -y
choco install nodejs --version=20.15.1 -y
choco install git docker-desktop -y
```

### Step 2: Set Up Docker

Ensure Docker Desktop is running on your machine. We will use Docker to run a MySQL server.

### Step 3: Configure Environment Variables

Set the following environment variables. This configuration allows the backend and frontend to communicate correctly. Add these user environment variables:

| Variable Name           | Value                      |
|-------------------------|----------------------------|
| PKMS_API_KEY            | (choose any value)         |
| PKMS_MYSQL_DATABASE     | ta3lim                     |
| PKMS_MYSQL_PASSWORD     | ta3lim                     |
| PKMS_MYSQL_USERNAME     | ta3lim                     |
| PKMS_PUBLIC_API         | http://localhost:8080      |
| PKMS_PUBLIC_URL         | http://localhost:3000      |

if you have any older Java version installed, verify the system environment variable `Path` and ensure `jdk-21` is at the top. 

### Step 4: Create directories for data storage:

```powershell
mkdir c:\dumps
mkdir c:\uploads
```

### Step 5: Set Up MySQL with Docker

Run the MySQL Docker container:

```powershell
docker run -p 3306:3306 --name mysql -d container-registry.oracle.com/mysql/community-server:9.0 --character-set-server=utf8mb4
```

Retrieve the generated MySQL root password:

```powershell
docker logs mysql 2>&1 | Select-String -Pattern "ROOT PASSWORD"
```

Log into the MySQL container and configure the database:

```powershell
docker exec -it mysql mysql -uroot -p
```

Enter the temporary password retrieved earlier and then run these commands inside the MySQL console:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';
CREATE SCHEMA ta3lim;
CREATE USER 'ta3lim'@'%';
ALTER USER 'ta3lim'@'%' IDENTIFIED BY 'ta3lim';
GRANT ALL ON ta3lim.* TO 'ta3lim'@'%';
FLUSH PRIVILEGES;
EXIT;
```

### Step 6: Set Up the Backend Server

Clone the backend repository and start the backend server:

```powershell
git clone https://github.com/JeroenAdam/ta3lim-backend
cd ta3lim-backend
./mvnw spring-boot:run
```

### Step 7: Set Up the Frontend Server

Clone the frontend repository:

```powershell
git clone https://github.com/JeroenAdam/my-personal-knowledge-management-system
cd my-personal-knowledge-management-system
```

<<<<<<< HEAD
Edit `App.js` and `ImageTextarea` to set the `apiKey` to the value you chose for `PKMS_API_KEY`.
=======
Edit `App.js` and `ImageTextarea.js` to set the `apiKey` to the value you chose for `PKMS_API_KEY`.
>>>>>>> 01a715a (Update README.md)

Install the necessary dependencies and start the frontend server:

```powershell
npm install
npm start
```

### Step 8: Access Your PKM App

Go to `http://localhost:3000`. You can now start adding notes, uploading images, etc.

### Optional: Automatic Backups

For automatic backups, you can use `megatools`. This requires a free mega.nz account and works out-of-the-box with MySQL 9 locally installed (not Docker) on Windows. It is disabled by default but can be enabled by adding the necessary environment variables.

## Congratulations!

Your PKM app is now set up and ready.

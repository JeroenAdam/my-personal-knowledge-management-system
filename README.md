# Introduction

My PKM app enables the storage, structuring, and retrieval of information/knowledge. It supports text, images, files, videos, internal links, tags and search. Ideal for learning, research, work procedures, and personal note structuring. Built with Spring Boot 3.3, React 18 and Elasticsearch.

# Screenshots
 
![pkms-latest](https://github.com/user-attachments/assets/82e26462-ebf7-41db-9437-cda8ca3eae81)
 
    
![image](https://github.com/user-attachments/assets/c7db42df-7634-466a-ad6f-d93ff1b6d3bb)

 
![image](https://github.com/user-attachments/assets/99c0c40c-20dd-42cf-bb17-23a78f8fc886)


![pkms-search](https://github.com/user-attachments/assets/0a32ae51-8e27-4414-b6a9-426f4048f7ec)


# Installing a development server (Windows)

I'll walk you through setting up both the backend and frontend server on a Windows machine.
You'll have a fully functional PKM app ready for use or for development.

## Prerequisites

This guide assumes a clean Windows installation. If you prefer a new virtual machine, go [here](https://github.com/JeroenAdam/New-VM-for-development) and come back later. We will be using the Chocolatey package manager. If you don't have Chocolatey installed, follow the instructions on the [Chocolatey installation page](https://chocolatey.org/install).

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

This configuration allows the backend and frontend to communicate correctly. Add these user environment variables:

| Variable Name           | Value                      |
|-------------------------|----------------------------|
| PKMS_API_KEY            | (choose any value)         |
| PKMS_MYSQL_PORT         | 3306                       |
| PKMS_MYSQL_DATABASE     | ta3lim                     |
| PKMS_MYSQL_USERNAME     | ta3lim                     |
| PKMS_MYSQL_PASSWORD     | ta3lim                     |
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

Launch a separate PowerShell window and clone the frontend repository:

```powershell
git clone https://github.com/JeroenAdam/my-personal-knowledge-management-system
cd my-personal-knowledge-management-system
```

Edit `App.js` to set the `apiKey` to the value you chose for `PKMS_API_KEY`.

Install the necessary dependencies and start the frontend server:

```powershell
npm install
npm start
```

### Step 8: Access Your PKM App

Go to `http://localhost:3000`. You can now start adding notes, uploading images, etc.


## Congratulations!

Your PKM app is now set up and ready.
![my-first-note](https://github.com/user-attachments/assets/e2d6630c-97ba-4130-96c2-045098d2ac3d)

### Optional: Elasticsearch integration

To get the search bar working, you'll need to set up your own Elasticsearch server.
After that, create a role and generate an API key with both these commands:

```cmd
curl -u elastic:password -X PUT "http://localhost:9200/_security/role/notes_role" \
-H "Content-Type: application/json" \
-d '{
  "cluster": ["all"],
  "indices": [
    {
      "names": ["notes"],
      "privileges": ["read", "write", "view_index_metadata"]
    }
  ]
}'
```

```cmd
curl -u elastic:password -X POST "http://localhost:9200/_security/api_key" \
-H "Content-Type: application/json" \
-d '{
  "name": "notes_api_key",
  "role_descriptors": {
    "notes_role": {
      "cluster": ["all"],
      "index": [
        {
          "names": ["notes"],
          "privileges": ["read", "write", "view_index_metadata"]
        }
      ]
    }
  }
}'
```

Next, edit `App.js` and set `elasticsearchUrl`, then set `elasticsearchApiKey` to the value returned by the last command.

For setting up the backend, add these user environment variables:

| Variable Name           | Value                      |
|-------------------------|----------------------------|
| ELASTIC_URL             | http://localhost:9200      |
| ELASTIC_USER            | elastic                    |
| ELASTIC_PASSWORD        | password                   |

The `notes` index will be automatically created on first startup.


### Optional: Automatic Backups

For automatic backups, you can use `megatools`. This requires a free [mega.nz](https://mega.io/?aff=LC8QgvuXn7k) account and works out-of-the-box with MySQL 9 locally installed (not Docker) on Windows. It is disabled by default but can be enabled by adding the necessary environment variables.

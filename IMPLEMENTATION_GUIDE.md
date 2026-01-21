# BlockGate Server Management Implementation

## Overview
This implementation adds comprehensive server management features to BlockGate, including:
- Port configuration on server creation
- Full CurseForge modpack support
- Server management interface with file browser, properties editor, whitelist, and OPs management

## Changes Made

### 1. Server Creation Enhancements

#### Modified: `src/components/AddServerButton.tsx`
- Added **port input field** (default: 25565, range: 1024-65535)
- Fixed CurseForge modpack URL input (was incorrectly using serverName state)
- Added dedicated state variables:
  - `port` - for server port configuration
  - `cfPageUrl` - for CurseForge modpack URL
- Updated payload to include network configuration:
  ```typescript
  network: {
    serverPort: parseInt(port),
  }
  ```

### 2. Server Management Navigation

#### Modified: `src/components/ActiveTable.tsx` & `src/components/OfflineTable.tsx`
- Added **"Manage" button** to each server row
- Button navigates to `/panel/server/${server.id}/manage`
- Positioned before Stop/Start and Delete buttons

### 3. API Endpoints

#### `src/app/api/server-info/route.ts` (NEW)
**Purpose:** Retrieve server details, container status, and player information

**GET /api/server-info?id={serverId}**
- Returns:
  - Complete server metadata (name, type, version, IP, port, memory)
  - Container info (status, running state, timestamps)
  - Player count (parsed from logs)
  - Max players (from server.properties)

**Features:**
- Uses Docker exec to read server.properties for max-players
- Parses recent logs to estimate online player count
- Handles containers that are stopped gracefully

#### `src/app/api/server-files/route.ts` (NEW)
**Purpose:** Browse the /data directory inside the container

**GET /api/server-files?id={serverId}&path={path}**
- Lists files and directories at the specified path
- Returns file metadata:
  - Name
  - Type (file or directory)
  - Size
  - Permissions
- Uses `ls -la` via Docker exec
- Supports navigation (clicking directories updates path)

**Requirements:**
- Container must be running
- Only accessible by server owner

#### `src/app/api/server-properties/route.ts` (NEW)
**Purpose:** Read and edit server.properties file

**GET /api/server-properties?id={serverId}**
- Returns raw content of server.properties file
- Uses `cat /data/server.properties` via Docker exec

**POST /api/server-properties**
```json
{
  "serverId": "uuid",
  "content": "updated server.properties content"
}
```
- Writes new content to server.properties
- Escapes content for shell safety
- Returns success/error status

**Note:** Changes require server restart to take effect

#### `src/app/api/whitelist/route.ts` (NEW)
**Purpose:** Manage server whitelist (whitelist.json)

**GET /api/whitelist?id={serverId}**
- Returns array of whitelisted players with name and UUID

**POST /api/whitelist**
```json
{
  "serverId": "uuid",
  "action": "add" | "remove",
  "name": "PlayerName",
  "uuid": "player-uuid" // optional for add
}
```
- Add or remove players from whitelist
- Updates whitelist.json in container
- Returns updated list

#### `src/app/api/ops/route.ts` (NEW)
**Purpose:** Manage server operators (ops.json)

**GET /api/ops?id={serverId}**
- Returns array of operators with name, UUID, and permission level

**POST /api/ops**
```json
{
  "serverId": "uuid",
  "action": "add" | "remove",
  "name": "PlayerName",
  "uuid": "player-uuid", // optional
  "level": 1-4 // op level, default 4
}
```
- Add or remove operators
- Updates ops.json in container
- Permission levels: 1 (bypass spawn protection) to 4 (all commands)

### 4. Server Management UI

#### `src/app/panel/server/[id]/manage/page.tsx` (NEW)
Server-side Next.js page that:
- Validates user session
- Extracts server ID from URL params
- Renders ServerManagePage component

#### `src/app/pages/ServerManagePage.tsx` (NEW)
**Main Management Interface** - Client-side component with 5 tabs:

##### **Overview Tab**
Displays:
- Server Information card:
  - Server type (VANILLA, FORGE, FABRIC, etc.)
  - Version
  - IP address and port
  - Current status (running/stopped)
  - Memory allocation
  - Player count (X / Y online)
  - Container and volume names
- Container Status card:
  - Running state
  - Status
  - Started timestamp

##### **Files Tab**
File browser for /data directory:
- Lists files and directories with icons (📁 for dirs, 📄 for files)
- Shows permissions and file sizes
- Click directories to navigate
- Parent directory (..) navigation
- Current path display
- Read-only view (for safety)

##### **Properties Tab**
Server.properties editor:
- Loads current server.properties content
- Full-featured textarea editor (96 lines tall)
- Syntax highlighting via monospace font
- Save button (disabled if no changes)
- Warning: "Changes will take effect after server restart"
- Real-time edit tracking

##### **Whitelist Tab**
Manage whitelisted players:
- Input field to add new player by name
- List of current whitelisted players with:
  - Player name
  - UUID (if available)
  - Remove button
- Add via Enter key or button click
- Empty state message

##### **OPs Tab**
Manage server operators:
- Input field for player name
- Dropdown for OP level (1-4)
- List of current OPs showing:
  - Player name
  - UUID (if available)
  - Permission level
  - Remove button
- Add via Enter key or button click

## Technical Details

### Authentication
All API endpoints validate:
1. User session exists (via better-auth)
2. Server exists in database
3. User owns the server (ownerId matches session.user.id)

### Docker Integration
Uses dockerode library for all container operations:
- `container.exec()` - Run commands inside container
- `container.inspect()` - Get container state
- `container.logs()` - Read container logs

### Error Handling
- Graceful handling of stopped containers
- File not found scenarios (returns empty defaults)
- Permission errors
- Invalid server IDs

### Security Considerations
- All file paths are validated
- Shell escaping for file writes
- User ownership verification on all operations
- Read-only file browser (no delete/upload)
- No direct shell access

## Usage Guide

### Creating a Server with Custom Port
1. Click "Create New Server"
2. Fill in server details (name, type, version)
3. **Set Server Port** (default 25565)
4. For CurseForge:
   - Select "CurseForge Modpack" type
   - Enter modpack URL
   - Ensure API key is set in General settings
5. Click "Create Server"

### Managing a Server
1. Navigate to Server Management page
2. Click **"Manage"** button next to any server (online or offline)
3. View server info in Overview tab
4. Browse files in Files tab
5. Edit server.properties in Properties tab
6. Manage whitelist in Whitelist tab
7. Manage operators in OPs tab

### Editing server.properties
1. Go to server Manage page
2. Click "Server Properties" tab
3. Edit the properties file
4. Click "Save Changes"
5. **Restart the server** for changes to take effect

### Adding to Whitelist
1. Go to server Manage page
2. Click "Whitelist" tab
3. Enter player name
4. Click "Add Player" or press Enter
5. Player appears in list below

### Managing OPs
1. Go to server Manage page
2. Click "OPs" tab
3. Enter player name
4. Select permission level (1-4)
5. Click "Add OP" or press Enter
6. OP appears in list with level

## Testing Recommendations

### Server Creation
- Test creating server with custom port (e.g., 25566)
- Verify port is correctly mapped in Docker
- Test CurseForge modpack creation with valid URL
- Verify error handling for missing CF API key

### Server Management
- Test with both running and stopped servers
- Verify file browser navigation works
- Test server.properties editing and save
- Add/remove players from whitelist
- Add/remove operators at different levels
- Test with empty whitelist/ops files

### Edge Cases
- Try managing server you don't own (should fail)
- Try operations on stopped container (should show appropriate message)
- Test with very large server.properties files
- Test with special characters in player names

## Future Enhancements
- File upload/download functionality
- Real-time player count via RCON/query protocol
- Server console access
- Plugin/mod management
- Automated backups
- Performance metrics and charts

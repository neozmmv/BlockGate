# New Features: CurseForge Support & Server Configuration

This document describes the new features added to BlockGate for CurseForge modpack support and server configuration management.

## Feature 1: CurseForge Modpack Support

BlockGate now supports creating Minecraft servers with CurseForge modpacks using the AUTO_CURSEFORGE platform.

### How to Use

1. Click "Create New Server" button
2. Select "CurseForge Modpack" from the Type dropdown
3. Enter the following information:
   - **Server Name**: A unique name for your server
   - **CurseForge Page URL**: The full URL to the modpack page or a specific file
     - Example: `https://www.curseforge.com/minecraft/modpacks/all-the-mods-8`
     - Or slug format: `all-the-mods-8`
   - **CurseForge API Key**: Your API key from [CurseForge Console](https://console.curseforge.com/)
4. Click "Create Server"

### Requirements

- A valid CurseForge API key (free to generate at https://console.curseforge.com/)
- Sufficient memory allocation (recommended 4G or more for most modpacks)

### How It Works

When you create a CurseForge server, BlockGate:
1. Sets the container TYPE to AUTO_CURSEFORGE
2. Configures CF_PAGE_URL with your modpack URL
3. Configures CF_API_KEY for authentication
4. The itzg/minecraft-server image automatically:
   - Downloads the modpack
   - Installs the appropriate mod loader (Forge/Fabric)
   - Sets up all required mods
   - Handles updates on container restart

## Feature 2: Server Configuration Management

You can now manage server settings directly from the BlockGate interface.

### How to Use

1. In the Active or Offline Servers table, click the "Configure" button for any server
2. Choose between two tabs:
   - **Server Properties**: Edit server.properties file
   - **Whitelist**: Manage player whitelist

### Server Properties Tab

- View and edit the complete server.properties file
- Common settings you can modify:
  - `gamemode`: survival, creative, adventure, spectator
  - `difficulty`: peaceful, easy, normal, hard
  - `pvp`: true/false
  - `max-players`: maximum player count
  - `spawn-protection`: spawn area protection radius
  - And many more!
- Click "Save Changes" to apply modifications
- **Note**: Server must be restarted for changes to take effect

### Whitelist Tab

- View all whitelisted players
- Add new players by username
- Remove players from the whitelist
- Changes take effect immediately (no restart required)

## Technical Details

### CurseForge Implementation

The implementation follows the official [itzg/minecraft-server documentation](https://github.com/itzg/docker-minecraft-server) for AUTO_CURSEFORGE modpack platform.

Environment variables set:
- `TYPE=AUTO_CURSEFORGE`
- `CF_PAGE_URL=<your-modpack-url>`
- `CF_API_KEY=<your-api-key>`

### Server Configuration Implementation

Server configuration uses Docker exec commands to interact with files inside the running containers:
- Read operations use `cat` command
- Write operations use `tee` command with stdin
- Whitelist operations use `rcon-cli` for immediate effect

### Security Considerations

- API keys are stored securely in the database
- Only server owners can configure their servers
- Command injection is prevented using proper exec methods
- All operations require authentication

## Troubleshooting

### CurseForge Server Creation Issues

**Problem**: Server fails to start
- **Solution**: Check that your CurseForge API key is valid
- **Solution**: Ensure the modpack URL is correct
- **Solution**: Increase memory allocation (4G minimum recommended)

**Problem**: "Mods Need Download" message
- **Solution**: Some mods don't allow automated download. Check server logs for list of mods that need manual download

### Server Configuration Issues

**Problem**: Changes to server.properties not taking effect
- **Solution**: Restart the server after making changes

**Problem**: Whitelist changes not working
- **Solution**: Ensure whitelist is enabled in server.properties (`white-list=true`)
- **Solution**: Check that the player username is correct (case-sensitive)

**Problem**: Cannot access configuration page
- **Solution**: Ensure the server container is running
- **Solution**: Check that you have permission to access this server

## Future Enhancements

Potential improvements for future versions:
- Toast notifications instead of browser alerts
- Live server console access
- File browser for managing server files
- Backup and restore functionality
- Automated modpack updates
- Plugin/mod management interface

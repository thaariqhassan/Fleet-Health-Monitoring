const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Device = sequelize.define('Device', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  deviceType: { type: DataTypes.ENUM('mobile', 'tablet', 'iot-sensor', 'rugged-scanner'), defaultValue: 'mobile' },
  os: { type: DataTypes.STRING, defaultValue: 'unknown' },
  batteryLevel: { type: DataTypes.INTEGER, defaultValue: 100 },
  storageFreeMb: { type: DataTypes.INTEGER, defaultValue: 1000 },
  crashCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('online', 'offline', 'locked'), defaultValue: 'offline' },
  lastHeartbeat: { type: DataTypes.DATE, allowNull: true },
  healthScore: { type: DataTypes.INTEGER, defaultValue: 100 },
  healthStatus: { type: DataTypes.ENUM('healthy', 'warning', 'critical'), defaultValue: 'healthy' },
}, { timestamps: true });

module.exports = Device;
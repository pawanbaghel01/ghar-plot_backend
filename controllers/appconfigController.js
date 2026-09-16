import AppConfig from "../models/AppConfig.js";

// ➤ Create App Config (POST)
export const createAppConfig = async (req, res) => {
  try {
    const { platform, latestVersion, storeUrl } = req.body;

    // Check if config already exists for platform
    const existing = await AppConfig.findOne({ platform });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `${platform} config already exists`,
      });
    }

    const config = await AppConfig.create({
      platform,
      latestVersion,
      storeUrl,
    });

    res.status(201).json({
      success: true,
      message: "App config created successfully",
      data: config,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating app config",
      error: error.message,
    });
  }
};

// ➤ Get App Config (GET)
export const getAppConfig = async (req, res) => {
  try {
    const { platform } = req.query;

    let config;

    if (platform) {
      config = await AppConfig.findOne({ platform });
    } else {
      config = await AppConfig.find();
    }

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching app config",
      error: error.message,
    });
  }
};

// ➤ Update App Config (PUT / PATCH)
export const updateAppConfig = async (req, res) => {
  try {
    const { platform } = req.params; // e.g. /api/config/android
    const { latestVersion, storeUrl } = req.body;

    const config = await AppConfig.findOneAndUpdate(
      { platform },
      {
        latestVersion,
        storeUrl,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!config) {
      return res.status(404).json({
        success: false,
        message: "Config not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "App config updated successfully",
      data: config,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating app config",
      error: error.message,
    });
  }
};
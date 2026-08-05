const packages = {
  5: "Bronze (البرونزي)",
  15: "Silver (الفضي)",
  30: "Gold (الذهبي)",
  50: "Platinum (البلاتينيوم)",
  100: "Diamond (الماس)"
};

function getPackage(amount) {
  return packages[amount] || "Bronze (البرونزي)";
}

module.exports = { packages, getPackage };

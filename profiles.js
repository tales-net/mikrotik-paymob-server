// خريطة البروفايلات حسب قيمة الباقة
const profiles = {
  5: "Bronze (البرونزي)",
  15: "Silver (الفضي)",
  30: "Gold (الذهبي)",
  50: "Platinum (البلاتينيوم)",
  100: "Diamond (الماس)"
};

// دالة للحصول على اسم البروفايل بناءً على المبلغ
function getProfile(amount) {
  return profiles[amount] || "Bronze (البرونزي)";
}

// تصدير علشان تستخدمه في باقي الملفات
module.exports = { profiles, getProfile };

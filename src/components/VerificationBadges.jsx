import React from 'react';
import { CheckCircle, Leaf, Award, Shield, Star, Package, Zap } from 'lucide-react';

// Individual badge components
export const MobileVerifiedBadge = ({ size = 'sm' }) => (
  <span className={
    size === 'lg'
      ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-xs font-bold'
      : 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-[11px] font-bold'
  }>
    <CheckCircle size={size === 'lg' ? 13 : 11} />
    Mobile Verified
  </span>
);

export const FarmVerifiedBadge = ({ size = 'sm', status = 'VERIFIED' }) => {
  if (status === 'PENDING') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[11px] font-bold">
      <Leaf size={11} />
      Farm Review Pending
    </span>
  );
  return (
    <span className={
      size === 'lg'
        ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold'
        : 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold'
    }>
      <Leaf size={size === 'lg' ? 13 : 11} />
      Farm Verified
    </span>
  );
};

export const CommunityVerifiedBadge = ({ size = 'sm', status = 'VERIFIED' }) => {
  if (status === 'PENDING') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold">
      <Award size={11} />
      Doc Under Review
    </span>
  );
  return (
    <span className={
      size === 'lg'
        ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold'
        : 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold'
    }>
      <Award size={size === 'lg' ? 13 : 11} />
      Community Verified
    </span>
  );
};

export const TrustScorePill = ({ score = 0, size = 'sm' }) => {
  const color = score >= 80 ? 'bg-green-600' : score >= 50 ? 'bg-orange-500' : 'bg-gray-400';
  if (size === 'lg') return (
    <div className="flex items-center gap-2">
      <div className="relative w-12 h-12">
        <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
          <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="3"/>
          <circle cx="18" cy="18" r="14" fill="none" stroke="#2E7D32" strokeWidth="3"
            strokeDasharray={`${(score/100)*88} 88`} strokeLinecap="round"/>
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-gray-900">
          {Math.round(score)}
        </span>
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">Trust Score</p>
        <p className="text-sm font-extrabold text-gray-900">{Math.round(score)}/100</p>
      </div>
    </div>
  );
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[11px] font-bold ${color}`}>
      <Shield size={10} />
      {Math.round(score)}
    </span>
  );
};

// Full farmer trust card for buyer-facing views
export const FarmerTrustCard = ({ farmer }) => {
  if (!farmer) return null;
  const {
    phone_verified, farm_verified, community_verified,
    farm_verification_status, community_doc_status,
    trust_score = 0, average_rating = 0, total_ratings = 0,
    completed_orders_count = 0, response_speed = 'Normal',
  } = farmer;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-gray-900 text-sm">Farmer Trust Profile</h3>
        <TrustScorePill score={trust_score} size="sm" />
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {phone_verified && <MobileVerifiedBadge />}
        {farm_verified && <FarmVerifiedBadge status={farm_verification_status} />}
        {!farm_verified && farm_verification_status === 'PENDING' && <FarmVerifiedBadge status="PENDING" />}
        {community_verified && <CommunityVerifiedBadge status={community_doc_status} />}
        {!community_verified && community_doc_status === 'PENDING' && <CommunityVerifiedBadge status="PENDING" />}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <div className="text-center bg-gray-50 rounded-xl p-2">
          <div className="flex items-center justify-center gap-0.5">
            <Star size={12} className="text-yellow-500 fill-yellow-400" />
            <span className="font-extrabold text-sm text-gray-900">
              {total_ratings > 0 ? average_rating.toFixed(1) : '-'}
            </span>
          </div>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
            {total_ratings > 0 ? `${total_ratings} ratings` : 'No ratings'}
          </p>
        </div>
        <div className="text-center bg-gray-50 rounded-xl p-2">
          <div className="flex items-center justify-center gap-0.5">
            <Package size={12} className="text-green-600" />
            <span className="font-extrabold text-sm text-gray-900">{completed_orders_count}</span>
          </div>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">Orders</p>
        </div>
        <div className="text-center bg-gray-50 rounded-xl p-2">
          <div className="flex items-center justify-center gap-0.5">
            <Zap size={12} className={response_speed === 'Fast' ? 'text-green-600' : 'text-gray-400'} />
            <span className="font-extrabold text-sm text-gray-900">{response_speed}</span>
          </div>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">Response</p>
        </div>
      </div>
    </div>
  );
};

// Compact badge row for product cards
export const CompactBadgeRow = ({ farmer }) => {
  if (!farmer) return null;
  const { phone_verified, farm_verified, community_verified, trust_score = 0 } = farmer;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {phone_verified && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-100 text-green-800 text-[10px] font-bold">
          <CheckCircle size={9} /> Mobile
        </span>
      )}
      {farm_verified && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
          <Leaf size={9} /> Farm
        </span>
      )}
      {community_verified && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
          <Award size={9} /> Community
        </span>
      )}
      {trust_score > 0 && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gray-800 text-white text-[10px] font-bold">
          <Shield size={9} /> {Math.round(trust_score)}
        </span>
      )}
    </div>
  );
};

export default { MobileVerifiedBadge, FarmVerifiedBadge, CommunityVerifiedBadge, TrustScorePill, FarmerTrustCard, CompactBadgeRow };

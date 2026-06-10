import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Leaf, Award, Shield, Star, Package, Phone, Upload, Camera, FileText, AlertCircle, Loader2, Check, Zap, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { verificationAPI } from '../api';

const TRUST_COLOR = (score) => {
  if (score >= 80) return { ring: '#2E7D32', label: 'Excellent', bg: 'bg-green-50', text: 'text-green-700' };
  if (score >= 60) return { ring: '#F59E0B', label: 'Good', bg: 'bg-yellow-50', text: 'text-yellow-700' };
  if (score >= 40) return { ring: '#6B7280', label: 'Building', bg: 'bg-gray-50', text: 'text-gray-600' };
  return { ring: '#D1D5DB', label: 'New', bg: 'bg-gray-50', text: 'text-gray-400' };
};

const DOC_TYPES = [
  { value: 'panchayat_cert', label: 'Panchayat Certificate', emoji: '&#127979;' },
  { value: 'farmer_card', label: 'Farmer Registration Card', emoji: '&#128209;' },
  { value: 'agri_dept_cert', label: 'Agriculture Dept. Certificate', emoji: '&#127807;' },
  { value: 'land_tax', label: 'Land Tax Receipt', emoji: '&#128200;' },
  { value: 'possession_cert', label: 'Possession Certificate', emoji: '&#128203;' },
];

const FarmerVerificationTab = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState('');

  // Farm photo state
  const [farmPhoto, setFarmPhoto] = useState(null);
  const [cropPhoto, setCropPhoto] = useState(null);
  const [entrancePhoto, setEntrancePhoto] = useState(null);

  // Community doc state
  const [docType, setDocType] = useState('');
  const [docFile, setDocFile] = useState(null);

  // Expand sections
  const [expanded, setExpanded] = useState({ farm: false, community: false });

  const farmRef = useRef();
  const cropRef = useRef();
  const entranceRef = useRef();
  const docRef = useRef();

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await verificationAPI.getStatus();
      setStatus(res.data);
    } catch (e) {
      console.error('Verification status fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFarmSubmit = async () => {
    if (!farmPhoto && !cropPhoto && !entrancePhoto) {
      alert('Please upload at least one farm photo');
      return;
    }
    setSubmitting('farm');
    const fd = new FormData();
    if (farmPhoto) fd.append('photo_farm', farmPhoto);
    if (cropPhoto) fd.append('photo_crop', cropPhoto);
    if (entrancePhoto) fd.append('photo_entrance', entrancePhoto);
    try {
      const res = await verificationAPI.submitFarmPhotos(fd);
      alert(res.data.msg);
      await fetchStatus();
      setExpanded({ ...expanded, farm: false });
    } catch (e) {
      alert(e.response?.data?.msg || 'Upload failed. Try again.');
    } finally {
      setSubmitting('');
    }
  };

  const handleCommunitySubmit = async () => {
    if (!docType) { alert('Please select document type'); return; }
    if (!docFile) { alert('Please select a document file'); return; }
    setSubmitting('community');
    const fd = new FormData();
    fd.append('doc_type', docType);
    fd.append('document', docFile);
    try {
      const res = await verificationAPI.submitCommunityDoc(fd);
      alert(res.data.msg);
      await fetchStatus();
      setExpanded({ ...expanded, community: false });
    } catch (e) {
      alert(e.response?.data?.msg || 'Upload failed. Try again.');
    } finally {
      setSubmitting('');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={32} className="animate-spin text-green-600" />
    </div>
  );

  const score = status?.trust_score || 0;
  const tColor = TRUST_COLOR(score);
  const phoneVerified = status?.phone_verified !== false;
  const farmVerified = status?.farm_verified;
  const communityVerified = status?.community_verified;
  const farmPending = status?.farm_verification_status === 'PENDING';
  const communityPending = status?.community_doc_status === 'PENDING';

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-10">

      {/* Trust Score Hero Card */}
      <div className="bg-gradient-to-br from-green-800 to-green-600 rounded-3xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-green-200 text-sm font-semibold">Your Trust Score</p>
            <h2 className="text-4xl font-black mt-1">{Math.round(score)}<span className="text-2xl text-green-300">/100</span></h2>
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">
              {tColor.label}
            </span>
          </div>
          {/* Circular progress */}
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
              <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
              <circle cx="18" cy="18" r="14" fill="none" stroke="white" strokeWidth="3"
                strokeDasharray={score > 0 ? (score/100*88) + " 88" : "0 88"} strokeLinecap="round"/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield size={28} className="text-white/80" />
            </div>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Orders', value: status?.completed_orders_count || 0, icon: '&#128230;' },
            { label: 'Rating', value: status?.total_ratings > 0 ? (status?.average_rating || 0).toFixed(1) + '&#11088;' : 'No ratings', icon: '&#11088;' },
            { label: 'Speed', value: status?.response_speed || 'Normal', icon: '&#9889;' },
          ].map(item => (
            <div key={item.label} className="bg-white/15 rounded-2xl p-3 text-center">
              <p className="text-white text-base font-extrabold"
                dangerouslySetInnerHTML={{ __html: item.value.toString() }} />
              <p className="text-green-200 text-[10px] font-semibold mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Level 1: Mobile Verified */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Phone size={22} className={phoneVerified ? 'text-green-700' : 'text-gray-400'} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-gray-900">Level 1: Mobile Verified</h3>
              {phoneVerified && <CheckCircle size={16} className="text-green-600" />}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Your phone number is verified and shown on listings.</p>
          </div>
          <span className="px-3 py-1.5 rounded-full text-xs font-extrabold">
            {phoneVerified ? '&#9989; Active' : 'Pending'}
          </span>
        </div>
        {phoneVerified && (
          <div className="px-5 pb-4 -mt-1">
            <div className="bg-green-50 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <CheckCircle size={15} className="text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700 font-semibold">
                &#9989; Mobile Verified badge is showing on your products!
              </p>
            </div>
          </div>
        )}
        {/* Score contribution */}
        <div className="px-5 pb-4">
          <div className="flex justify-between text-xs text-gray-400 font-medium mb-1">
            <span>Contributes to Trust Score</span><span>+20 pts</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" />
          </div>
        </div>
      </div>

      {/* Level 2: Farm Verified */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          className="w-full p-5 flex items-center gap-4 text-left border-none bg-transparent cursor-pointer"
          onClick={() => setExpanded({ ...expanded, farm: !expanded.farm })}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Leaf size={22} className={farmVerified ? 'text-emerald-700' : 'text-gray-400'} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-gray-900">Level 2: Farm Verified</h3>
              {farmVerified && <CheckCircle size={16} className="text-emerald-600" />}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Upload 3 farm photos. Shows &#127807; Farm Verified badge.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold">
              {farmVerified ? '&#127807; Active' : farmPending ? 'Pending' : 'Optional'}
            </span>
            {!farmVerified && (expanded.farm ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />)}
          </div>
        </button>

        {!farmVerified && expanded.farm && (
          <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">
            <p className="text-sm text-gray-600 font-medium bg-blue-50 rounded-xl p-3">
              &#128247; Upload 3 clear photos: <strong>your farm, your crops, and the farm entrance</strong>. These are only used to verify you are a genuine farmer.
            </p>
            {[
              { label: 'Farm Photo', key: 'farm', state: farmPhoto, setter: setFarmPhoto, ref: farmRef, placeholder: 'Take or upload a wide photo of your farm land' },
              { label: 'Crop Photo', key: 'crop', state: cropPhoto, setter: setCropPhoto, ref: cropRef, placeholder: 'Photo of your current crops or harvest' },
              { label: 'Entrance Photo', key: 'entrance', state: entrancePhoto, setter: setEntrancePhoto, ref: entranceRef, placeholder: 'Photo of your farm entrance or gate' },
            ].map(({ label, state, setter, ref, placeholder }) => (
              <div key={label}>
                <label className="text-sm font-bold text-gray-700 mb-1.5 block">{label}</label>
                <button
                  onClick={() => ref.current?.click()}
                  className="w-full border-2 border-dashed rounded-2xl p-4 flex items-center gap-3 cursor-pointer border-none bg-transparent text-left transition-all">
                  <Camera size={20} className={state ? 'text-emerald-600' : 'text-gray-400'} />
                  <div>
                    <p className="text-sm font-semibold">
                      {state ? state.name : placeholder}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{state ? 'Tap to change' : 'JPG or PNG, max 5MB'}</p>
                  </div>
                  {state && <CheckCircle size={18} className="text-emerald-600 ml-auto" />}
                </button>
                <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => setter(e.target.files[0] || null)} />
              </div>
            ))}
            <button
              onClick={handleFarmSubmit}
              disabled={submitting === 'farm'}
              className="w-full btn btn-primary flex items-center justify-center gap-2">
              {submitting === 'farm' ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {submitting === 'farm' ? 'Uploading...' : 'Submit Farm Photos'}
            </button>
          </div>
        )}

        <div className="px-5 pb-4">
          <div className="flex justify-between text-xs text-gray-400 font-medium mb-1">
            <span>Contributes to Trust Score</span><span>+25 pts</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" />
          </div>
        </div>
      </div>

      {/* Level 3: Community Verified */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          className="w-full p-5 flex items-center gap-4 text-left border-none bg-transparent cursor-pointer"
          onClick={() => setExpanded({ ...expanded, community: !expanded.community })}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Award size={22} className={communityVerified ? 'text-purple-700' : 'text-gray-400'} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-gray-900">Level 3: Community Verified</h3>
              {communityVerified && <CheckCircle size={16} className="text-purple-600" />}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Upload one official document. Shows &#127942; Community Verified badge.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold">
              {communityVerified ? '&#127942; Active' : communityPending ? 'Pending' : 'Optional'}
            </span>
            {!communityVerified && (expanded.community ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />)}
          </div>
        </button>

        {!communityVerified && expanded.community && (
          <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">
            <p className="text-sm text-gray-600 font-medium bg-purple-50 rounded-xl p-3">
              &#128196; Submit <strong>one</strong> government or panchayat document that confirms you are a farmer. We do NOT display document details publicly.
            </p>

            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">Select Document Type</label>
              <div className="space-y-2">
                {DOC_TYPES.map(dt => (
                  <button
                    key={dt.value}
                    onClick={() => setDocType(dt.value)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left cursor-pointer bg-transparent">
                    <span dangerouslySetInnerHTML={{ __html: dt.emoji }} className="text-lg" />
                    <span className="font-semibold text-sm">{dt.label}</span>
                    {docType === dt.value && <CheckCircle size={16} className="text-purple-600 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 mb-1.5 block">Upload Document</label>
              <button
                onClick={() => docRef.current?.click()}
                className="w-full border-2 border-dashed rounded-2xl p-4 flex items-center gap-3 cursor-pointer border-none bg-transparent text-left transition-all">
                <FileText size={20} className={docFile ? 'text-purple-600' : 'text-gray-400'} />
                <div>
                  <p className="text-sm font-semibold">
                    {docFile ? docFile.name : 'Upload photo or PDF of document'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{docFile ? 'Tap to change' : 'JPG, PNG, or PDF'}</p>
                </div>
                {docFile && <CheckCircle size={18} className="text-purple-600 ml-auto" />}
              </button>
              <input ref={docRef} type="file" accept="image/*,.pdf" className="hidden"
                onChange={e => setDocFile(e.target.files[0] || null)} />
            </div>

            <div className="bg-gray-50 rounded-2xl p-3 flex items-start gap-2">
              <Shield size={15} className="text-gray-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Your document is stored securely and only used for verification. We never share document details with buyers. Only the verified badge is shown publicly.
              </p>
            </div>

            <button
              onClick={handleCommunitySubmit}
              disabled={submitting === 'community'}
              className="w-full btn flex items-center justify-center gap-2 bg-purple-700 text-white rounded-2xl hover:bg-purple-800" style={{minHeight:'52px'}}>
              {submitting === 'community' ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {submitting === 'community' ? 'Uploading...' : 'Submit Document'}
            </button>
          </div>
        )}

        <div className="px-5 pb-4">
          <div className="flex justify-between text-xs text-gray-400 font-medium mb-1">
            <span>Contributes to Trust Score</span><span>+20 pts</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" />
          </div>
        </div>
      </div>

      {/* What buyers see */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-extrabold text-gray-900 mb-3">&#128065; What buyers see</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {phoneVerified && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-xs font-bold">
              <CheckCircle size={13} /> Mobile Verified
            </span>
          )}
          {farmVerified && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              <Leaf size={13} /> Farm Verified
            </span>
          )}
          {communityVerified && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">
              <Award size={13} /> Community Verified
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-800 text-white text-xs font-bold">
            <Shield size={13} /> Trust: {Math.round(score)}
          </span>
        </div>
        <p className="text-xs text-gray-400 font-medium">
          More badges = more buyer trust = more sales
        </p>
      </div>

    </div>
  );
};

export default FarmerVerificationTab;

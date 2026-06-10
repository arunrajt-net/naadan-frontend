import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowRight } from 'lucide-react';

export default function TermsAndConditions() {
  const navigate = useNavigate();

  const handleAccept = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
        {/* Banner header */}
        <div className="bg-gradient-to-r from-green-800 to-green-600 px-8 py-10 text-white text-center relative">
          <div className="absolute top-4 left-4">
            <button 
              onClick={() => navigate(-1)}
              className="bg-white/10 hover:bg-white/20 text-white font-bold p-2.5 rounded-full border-none cursor-pointer transition-all flex items-center justify-center"
              title="Go Back"
            >
              <ArrowRight className="rotate-180" size={18} />
            </button>
          </div>
          <div className="flex justify-center mb-4">
            <div className="bg-white/10 p-3.5 rounded-2xl backdrop-blur-md">
              <FileText size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-black mb-2 tracking-tight">Terms &amp; Conditions</h1>
          <p className="text-green-100 text-sm font-semibold max-w-md mx-auto">
            Welcome to Naadan – From Our Land to Your Hand
          </p>
        </div>

        {/* Scrollable Terms Content */}
        <div className="px-8 py-8 max-h-[50vh] overflow-y-auto border-b border-gray-150 space-y-6 text-gray-700 text-sm leading-relaxed">
          <p className="font-bold text-gray-800 text-base">
            By using Naadan, you agree to the following:
          </p>

          <ol className="list-decimal pl-5 space-y-4 font-medium text-gray-600">
            <li>
              <span className="font-bold text-gray-900 block mb-1">1. User Information Accuracy</span>
              Users must provide accurate and truthful information during registration and while using the platform.
            </li>
            <li>
              <span className="font-bold text-gray-900 block mb-1">2. Pricing &amp; Listings Updates</span>
              Product prices, availability, and listings may change at any time without prior notice.
            </li>
            <li>
              <span className="font-bold text-gray-900 block mb-1">3. Seller Responsibility</span>
              Farmers and sellers are solely responsible for the quality, authenticity, legality, safety, freshness, and condition of the products they sell.
            </li>
            <li>
              <span className="font-bold text-gray-900 block mb-1">4. Health &amp; Safety Indemnification</span>
              Farmers and sellers are solely responsible for any health issues, allergic reactions, contamination, excessive pesticide residues, fertilizer residues, spoilage, or other consequences arising from products sold through the platform.
            </li>
            <li>
              <span className="font-bold text-gray-900 block mb-1">5. Digital Marketplace Limitation</span>
              Naadan acts only as a digital marketplace connecting buyers and farmers and is not the manufacturer, producer, owner, or distributor of listed products.
            </li>
            <li>
              <span className="font-bold text-gray-900 block mb-1">6. Limitation of Liability</span>
              Naadan shall not be held liable for damages, losses, health issues, injuries, disputes, product quality issues, delivery issues, or other consequences resulting from transactions between users.
            </li>
            <li>
              <span className="font-bold text-gray-900 block mb-1">7. Buyer Inspection Encouraged</span>
              Buyers are encouraged to inspect products upon receipt and report valid issues through the platform.
            </li>
            <li>
              <span className="font-bold text-gray-900 block mb-1">8. Refunds &amp; Dispute Resolutions</span>
              Refunds, replacements, or dispute resolutions may be provided only for verified cases such as:
              <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-500">
                <li>Damaged products</li>
                <li>Spoiled products</li>
                <li>Incorrect products</li>
                <li>Non-delivery of confirmed orders</li>
              </ul>
            </li>
            <li>
              <span className="font-bold text-gray-900 block mb-1">9. Prohibited Abuse &amp; Fraud</span>
              Users must not engage in fraud, abuse, impersonation, harassment, illegal activities, or misuse of the platform.
            </li>
            <li>
              <span className="font-bold text-gray-900 block mb-1">10. Information Abuse Restriction</span>
              Phone numbers, location information, and account details must not be used for spam, harassment, or unauthorized commercial activities.
            </li>
            <li>
              <span className="font-bold text-gray-900 block mb-1">11. Use of Personal Data</span>
              User data will be used only for providing marketplace services, account management, support, security, and platform improvements.
            </li>
            <li>
              <span className="font-bold text-gray-900 block mb-1">12. Right to Terminate</span>
              Naadan reserves the right to suspend or terminate accounts that violate platform policies.
            </li>
            <li>
              <span className="font-bold text-gray-900 block mb-1">13. Platform Intellectual Property</span>
              All Naadan branding, logos, designs, graphics, and platform content remain the property of Naadan.
            </li>
            <li>
              <span className="font-bold text-gray-900 block mb-1">14. Policy Amendments</span>
              Naadan may update these Terms &amp; Conditions from time to time. Continued use of the platform constitutes acceptance of updated terms.
            </li>
            <li>
              <span className="font-bold text-gray-900 block mb-1">15. Acknowledgment &amp; Consent</span>
              By creating an account and using Naadan, you acknowledge that you have read, understood, and agreed to these Terms &amp; Conditions.
            </li>
          </ol>
        </div>

        {/* Footer Accept Action */}
        <div className="px-8 py-6 bg-gray-50 flex flex-col items-center justify-center">
          <button
            onClick={handleAccept}
            className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg shadow-green-700/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border-none text-sm"
          >
            I Have Read And Accept These Terms &amp; Conditions
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

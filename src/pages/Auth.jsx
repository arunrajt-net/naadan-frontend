import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api';
import { auth, googleProvider } from '../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail, RecaptchaVerifier, signInWithPhoneNumber, updatePassword } from 'firebase/auth';
import { Lock, LogIn, Mail, ShieldAlert, User, Eye, EyeOff } from 'lucide-react';

const Auth = ({ isAdminLogin = false }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1 = Input, 2 = Verify OTP, 3 = Reset Password
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotResetToken, setForgotResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [cooldownTime, setCooldownTime] = useState(0);
  const [otpExpiryTime, setOtpExpiryTime] = useState(0);

  // Registration OTP states
  const [showRegisterOtpModal, setShowRegisterOtpModal] = useState(false);
  const [registerOtp, setRegisterOtp] = useState('');
  const [registerToken, setRegisterToken] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerCooldown, setRegisterCooldown] = useState(0);
  const [registerExpiry, setRegisterExpiry] = useState(0);

  const [confirmationResult, setConfirmationResult] = useState(null);
  const [smsProvider, setSmsProvider] = useState('MOCK');

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await authAPI.getAuthConfig();
        setSmsProvider(res.data.sms_provider);
      } catch (err) {
        console.error("Failed to fetch SMS provider config:", err);
      }
    };
    fetchConfig();
  }, []);

  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        console.warn("Failed to clear existing recaptcha verifier:", e);
      }
      window.recaptchaVerifier = null;
    }
    
    // Completely remove the old element if it exists to reset reCAPTCHA rendering
    const oldContainer = document.getElementById('recaptcha-container');
    if (oldContainer) {
      try {
        oldContainer.remove();
      } catch (e) {
        console.warn("Failed to remove old recaptcha container:", e);
      }
    }
    
    // Create a fresh DOM element at the bottom of the body
    const newContainer = document.createElement('div');
    newContainer.id = 'recaptcha-container';
    document.body.appendChild(newContainer);

    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: (response) => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        // Response expired
      }
    });
  };


  // OTP Cooldown countdown timer
  useEffect(() => {
    if (cooldownTime <= 0) return;
    const timer = setTimeout(() => {
      setCooldownTime(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownTime]);

  // OTP Expiry countdown timer
  useEffect(() => {
    if (otpExpiryTime <= 0) return;
    const timer = setTimeout(() => {
      setOtpExpiryTime(prev => {
        if (prev <= 1) {
          setForgotError("OTP has expired. Please request a new code.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [otpExpiryTime]);

  // Registration OTP Cooldown countdown timer
  useEffect(() => {
    if (registerCooldown <= 0) return;
    const timer = setTimeout(() => {
      setRegisterCooldown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [registerCooldown]);

  // Registration OTP Expiry countdown timer
  useEffect(() => {
    if (registerExpiry <= 0) return;
    const timer = setTimeout(() => {
      setRegisterExpiry(prev => {
        if (prev <= 1) {
          setRegisterError("OTP has expired. Please request a new code.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [registerExpiry]);
  const [formData, setFormData] = useState({
    name: '',
    phoneOrEmail: '',
    password: '',
    role: 'buyer'
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const [termsAccepted, setTermsAccepted] = useState(false);

  const validateInputs = () => {
    const trimmedInput = formData.phoneOrEmail.trim();
    
    // Check if it's a phone number (all digits)
    if (/^\d+$/.test(trimmedInput)) {
      if (trimmedInput.length !== 10) {
        setErrorMsg('Phone number must be exactly 10 digits.');
        return false;
      }
    } else {
      // Check if it's a valid email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedInput)) {
        setErrorMsg('Please enter a valid email address or 10-digit phone number.');
        return false;
      }
    }

    if (formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return false;
    }

    if (!isLogin && !formData.name.trim()) {
      setErrorMsg('Full Name is required.');
      return false;
    }

    return true;
  };

  const handleSessionSetup = (userState) => {
    localStorage.setItem('user', JSON.stringify(userState));
    
    // Choose active role based on capabilities
    let activeRole = localStorage.getItem('activeRole');
    if (!activeRole) {
      if (userState.is_admin) {
        activeRole = 'admin';
      } else if (userState.is_farmer && !userState.is_buyer) {
        activeRole = 'farmer';
      } else if (userState.is_buyer && !userState.is_farmer) {
        activeRole = 'buyer';
      } else {
        activeRole = userState.role || 'buyer';
      }
      localStorage.setItem('activeRole', activeRole);
    }

    // Verify compatibility
    const isAuthorized = 
      (activeRole === 'admin' && userState.is_admin) ||
      (activeRole === 'farmer' && userState.is_farmer) ||
      (activeRole === 'buyer' && userState.is_buyer);
      
    if (!isAuthorized) {
      localStorage.removeItem('activeRole');
      activeRole = null;
    }

    if (userState.is_farmer && userState.is_buyer && !activeRole) {
      navigate('/profile');
    } else {
      if (activeRole === 'admin') {
        navigate('/admin');
      } else if (activeRole === 'farmer') {
        navigate('/farmer/dashboard');
      } else {
        navigate('/buyer/search');
      }
    }
  };

  const syncToBackendAndRedirect = async (firebaseUser, isFallbackLat = null, isFallbackLng = null) => {
    try {
      const idToken = await firebaseUser.getIdToken();
      localStorage.setItem('token', idToken);
      
      let enteredPhone = '';
      const inputTrimmed = formData.phoneOrEmail.trim();
      if (/^\d{10}$/.test(inputTrimmed)) {
        enteredPhone = inputTrimmed;
      }
      
      const payload = {
        role: formData.role,
        lat: isFallbackLat,
        lng: isFallbackLng,
        phone: enteredPhone || firebaseUser.phoneNumber || '',
        registration_token: registerToken
      };
      
      const nameVal = formData.name || firebaseUser.displayName;
      if (nameVal && nameVal !== 'User') {
        payload.name = nameVal;
      } else if (!isLogin) {
        payload.name = 'User';
      }
      
      const res = await authAPI.sync(payload);
      
      if (res.data.status === 'link_required') {
        const confirmLink = window.confirm(
          `An existing account with email ${res.data.email} was found. Would you like to link your Google account to this existing account?`
        );
        if (confirmLink) {
          const linkRes = await authAPI.linkAccounts();
          handleSessionSetup(linkRes.data.user);
        } else {
          localStorage.removeItem('token');
          setErrorMsg('Sign-in cancelled. Account linking is required.');
        }
        return;
      }
      
      handleSessionSetup(res.data.user);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.msg || 'Failed to sync user details with the server database.');
    } finally {
      setLoading(false);
    }
  };

  const handleActionWithLocation = async (firebaseAction) => {
    setLoading(true);
    setErrorMsg('');
    
    // Always attempt GPS if registering (timeout of 5 seconds to prevent hanging)
    if (navigator.geolocation && !isLogin) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
             const userCredential = await firebaseAction();
             await syncToBackendAndRedirect(userCredential.user, pos.coords.latitude, pos.coords.longitude);
          } catch (err) {
             setErrorMsg(err.message.replace('Firebase: ', ''));
             setLoading(false);
          }
        },
        async (err) => {
           console.warn("Location blocked, falling back to default.", err);
           try {
             const userCredential = await firebaseAction();
             await syncToBackendAndRedirect(userCredential.user, 10.0, 76.0);
             alert("Registered with default Kerala coordinates because GPS was blocked or timed out.");
           } catch(e) {
             setErrorMsg(e.message.replace('Firebase: ', ''));
             setLoading(false);
           }
        },
        { timeout: 5000 } // 5 seconds timeout
      );
    } else {
      // Direct login path without forcing GPS
      try {
         const userCredential = await firebaseAction();
         await syncToBackendAndRedirect(userCredential.user, null, null);
      } catch (err) {
         setErrorMsg(err.message.replace('Firebase: ', ''));
         setLoading(false);
      }
    }
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleRequestRecoveryOtp = async (e) => {
    if (e) e.preventDefault();
    setSendingReset(true);
    setForgotSuccess('');
    setForgotError('');

    const input = forgotEmail.trim();
    if (!input) {
      setForgotError("Please enter your email or phone number.");
      setSendingReset(false);
      return;
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);

    if (isEmail) {
      try {
        await sendPasswordResetEmail(auth, input);
        setForgotSuccess("A password recovery email has been sent to your address.");
        setForgotEmail('');
      } catch (err) {
        console.error(err);
        setForgotError(err.message.replace('Firebase: ', '') || "Failed to send password recovery email.");
      } finally {
        setSendingReset(false);
      }
    } else {
      const isDigits = /^\d+$/.test(input);
      if (!isDigits || input.length !== 10) {
        setForgotError("Please enter a valid 10-digit Indian phone number.");
        setSendingReset(false);
        return;
      }
      
      if (!/^[6-9]\d{9}$/.test(input)) {
        setForgotError("Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9.");
        setSendingReset(false);
        return;
      }

      try {
        if (smsProvider === 'FIREBASE') {
          setupRecaptcha();
          const appVerifier = window.recaptchaVerifier;
          const formattedPhone = '+91' + input;
          const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
          setConfirmationResult(confirmation);
          setForgotPhone(input);
          setForgotSuccess("OTP sent to your mobile number via Firebase.");
          setCooldownTime(60);
          setOtpExpiryTime(300); // 5 minutes
          setForgotStep(2);
        } else {
          await authAPI.forgotPassword(input);
          setForgotPhone(input);
          setForgotSuccess("OTP sent to your mobile number.");
          setCooldownTime(60);
          setOtpExpiryTime(300); // 5 minutes
          setForgotStep(2);
        }
      } catch (err) {
        console.error("Firebase Send OTP Error Details:", err);
        const errorDetails = err.code || err.message || JSON.stringify(err);
        setForgotError(`Failed to send OTP: ${errorDetails}`);
      } finally {
        setSendingReset(false);
      }
    }
  };

  const handleVerifyRecoveryOtp = async (e) => {
    e.preventDefault();
    setSendingReset(true);
    setForgotSuccess('');
    setForgotError('');

    const otpVal = forgotOtp.trim();
    if (otpVal.length !== 6 || !/^\d+$/.test(otpVal)) {
      setForgotError("Please enter a valid 6-digit OTP code.");
      setSendingReset(false);
      return;
    }

    try {
      if (smsProvider === 'FIREBASE' && confirmationResult) {
        const result = await confirmationResult.confirm(otpVal);
        const idToken = await result.user.getIdToken();
        setForgotResetToken(idToken);
        setForgotSuccess('');
        setForgotStep(3);
        setOtpExpiryTime(0);
      } else {
        const res = await authAPI.verifyRecoveryOtp(forgotPhone, otpVal);
        setForgotResetToken(res.data.reset_token);
        setForgotSuccess('');
        setForgotStep(3);
        setOtpExpiryTime(0);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.msg || err.message || "Invalid OTP. Please try again.";
      setForgotError(errMsg.replace('Firebase: ', ''));
    } finally {
      setSendingReset(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setSendingReset(true);
    setForgotSuccess('');
    setForgotError('');

    const pwd = newPassword.trim();
    const cpwd = confirmNewPassword.trim();

    if (!pwd || !cpwd) {
      setForgotError("Please fill out all password fields.");
      setSendingReset(false);
      return;
    }

    if (pwd !== cpwd) {
      setForgotError("Passwords do not match.");
      setSendingReset(false);
      return;
    }

    // Strong Password Validation
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!strongPasswordRegex.test(pwd)) {
      setForgotError("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.");
      setSendingReset(false);
      return;
    }

    try {
      if (smsProvider === 'FIREBASE') {
        if (!forgotResetToken) {
          throw new Error("Verification session expired. Please try again.");
        }
        await authAPI.resetPasswordFirebase(forgotPhone, forgotResetToken, pwd);
      } else {
        await authAPI.resetPassword(forgotPhone, forgotResetToken, pwd);
      }
      
      // Session Invalidation: Logout client sessions
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('activeRole');
      localStorage.removeItem('cart');
      await auth.signOut();

      alert("Password updated successfully! Please log in with your new password.");
      setShowForgotModal(false);
      
      // Reset Modal States
      setForgotEmail('');
      setForgotPhone('');
      setForgotOtp('');
      setForgotResetToken('');
      setNewPassword('');
      setConfirmNewPassword('');
      setForgotStep(1);
      setConfirmationResult(null);
      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
    } catch (err) {
      console.error(err);
      setForgotError(err.response?.data?.msg || "Failed to reset password.");
    } finally {
      setSendingReset(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isAdminLogin) {
      setLoading(true);
      setErrorMsg('');
      try {
        const res = await authAPI.adminLogin(formData.phoneOrEmail, formData.password);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('activeRole', 'admin');
        localStorage.setItem('user', JSON.stringify(res.data.user));
        navigate('/admin');
      } catch (err) {
        console.error(err);
        setErrorMsg(err.response?.data?.msg || 'Invalid credentials or connection error.');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    if (!isLogin && !termsAccepted) {
      setErrorMsg("Please accept the Terms & Conditions before creating an account.");
      return;
    }
    
    if (!validateInputs()) return;
    
    let authEmail = formData.phoneOrEmail.trim();
    if (/^\d{10}$/.test(authEmail)) {
        authEmail = `${authEmail}@naadan.com`;
    }
    
    if (isLogin) {
       handleActionWithLocation(() => signInWithEmailAndPassword(auth, authEmail, formData.password));
    } else {
       const isPhone = /^\d{10}$/.test(formData.phoneOrEmail.trim());
       if (isPhone && smsProvider !== 'FIREBASE') {
          setLoading(true);
          setErrorMsg('');
          try {
             const phoneVal = formData.phoneOrEmail.trim();
             await authAPI.registerRequestOtp(phoneVal);
             setRegisterSuccess("Verification OTP sent to your phone number.");
             setRegisterError('');
             setRegisterCooldown(60);
             setRegisterExpiry(300);
             setShowRegisterOtpModal(true);
          } catch (err) {
             console.error(err);
             const errMsg = err.response?.data?.msg || err.message || "Failed to request signup OTP. Please try again.";
             setErrorMsg(errMsg.replace('Firebase: ', ''));
          } finally {
             setLoading(false);
          }
       } else {
          handleActionWithLocation(() => createUserWithEmailAndPassword(auth, authEmail, formData.password));
       }
    }
  };

  const handleGoogleSignIn = () => {
    if (!isLogin && !termsAccepted) {
      setErrorMsg("Please accept the Terms & Conditions before creating an account.");
      return;
    }
    handleActionWithLocation(() => signInWithPopup(auth, googleProvider));
  };

  return (
    <div className="container flex justify-center items-center" style={{ minHeight: 'calc(100vh - 80px)', padding: '2rem 1rem' }}>
      <div className="card glass animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', borderRadius: '2rem' }}>
        <h2 className="text-3xl font-black text-center mb-2 text-gray-900">
          {isAdminLogin ? 'Panchayat Manager Portal' : (isLogin ? 'Welcome Back' : 'Join Naadan')}
        </h2>
        <p className="text-center text-sm text-gray-500 mb-6 font-medium">
          {isAdminLogin ? 'Market operations, verifications, and pricing benchmarks' : 'Direct connection, fresh produce, fair prices'}
        </p>
        
        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6 text-sm font-medium text-center flex items-center justify-center gap-2">
            <ShieldAlert size={16} />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && !isAdminLogin && (
            <div className="form-group relative">
              <User className="absolute left-3.5 top-3.5 text-gray-400" size={20} />
              <input 
                type="text" 
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none transition-all font-medium text-gray-800" 
                placeholder="Full Name"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
          )}
          
          <div className="form-group relative">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">
              {isAdminLogin ? 'Admin Email or Phone' : 'Email or Phone Number'}
            </label>
            <div className="relative">
               <Mail className="absolute left-3.5 top-3.5 text-gray-400" size={20} />
               <input 
                 type="text" 
                 className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none transition-all font-medium text-gray-800" 
                 placeholder={isAdminLogin ? "admin@naadan.com or 9497856550" : "Enter email or 10-digit phone"}
                 value={formData.phoneOrEmail}
                 onChange={e => setFormData({...formData, phoneOrEmail: e.target.value})}
                 required
               />
            </div>
          </div>
          
          <div className="form-group relative">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 text-gray-400" size={20} />
              <input 
                type={showPassword ? "text" : "password"} 
                className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none transition-all font-medium text-gray-800" 
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer p-1 flex items-center justify-center transition-colors"
                style={{ zIndex: 10 }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {isLogin && !isAdminLogin && (
              <div className="text-right mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotSuccess('');
                    setForgotError('');
                  }}
                  className="text-xs text-green-600 hover:text-green-700 font-bold border-none bg-transparent cursor-pointer underline"
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>

          {!isLogin && !isAdminLogin && (
            <div className="form-group">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Select Role</label>
              <select 
                className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 outline-none transition-all font-semibold text-gray-700 cursor-pointer"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
              >
                <option value="buyer">I want to Buy Produce (Buyer)</option>
                <option value="farmer">I want to Sell Produce (Farmer)</option>
              </select>
            </div>
          )}

          {!isLogin && !isAdminLogin && (
            <div className="flex items-start gap-2.5 my-2">
              <input 
                id="termsCheckbox"
                type="checkbox" 
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
              />
              <label htmlFor="termsCheckbox" className="text-xs text-gray-500 font-semibold leading-normal cursor-pointer select-none">
                I have read and agree to the <Link to="/terms-and-conditions" target="_blank" className="text-green-600 hover:text-green-700 underline font-bold">Terms &amp; Conditions</Link> and Privacy Policy.
              </label>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-green-600/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border-none"
            disabled={loading}
          >
            <LogIn size={20} />
            {loading ? 'Processing...' : (isAdminLogin ? 'Admin Sign In' : (isLogin ? 'Sign In' : 'Create Account'))}
          </button>
        </form>

        {!isAdminLogin && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-150"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-400 font-bold">Or continue with</span>
              </div>
            </div>

            <button 
              type="button" 
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-bold py-3.5 px-4 rounded-xl border border-gray-200 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
              disabled={loading}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.78 0 3.3.61 4.56 1.81l3.4-3.4C17.9 1.48 15.15.5 12 .5 7.37.5 3.39 3.16 1.48 7.06l4.03 3.12c1-2.95 3.75-5.14 6.49-5.14z"/>
                <path fill="#4285F4" d="M23.49 12.27c0-.86-.08-1.68-.22-2.48H12v4.69h6.48c-.28 1.47-1.11 2.72-2.36 3.56l3.66 2.84c2.14-1.98 3.37-4.89 3.37-8.61z"/>
                <path fill="#FBBC05" d="M5.51 10.18c-.25-.76-.39-1.57-.39-2.41s.14-1.65.39-2.41L1.48 2.24C.53 4.14 0 6.27 0 8.5s.53 4.36 1.48 6.26l4.03-3.12z"/>
                <path fill="#34A853" d="M12 23.5c3.24 0 5.95-1.08 7.93-2.91l-3.66-2.84c-1.01.68-2.31 1.09-4.27 1.09-2.74 0-5.49-2.19-6.49-5.14L1.48 14.76c1.91 3.9 5.89 6.56 10.52 6.56z"/>
              </svg>
              Google
            </button>

            <p className="text-center mt-6 text-gray-500 font-bold text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button" 
                className="text-green-600 hover:text-green-700 font-black ml-1 transition-colors border-none bg-transparent cursor-pointer"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? 'Sign up' : 'Login'}
              </button>
            </p>
          </>
        )}
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-gray-150 shadow-2xl relative animate-fade-in">
            <h3 className="text-2xl font-black text-gray-900 mb-2">Recover Password</h3>
            
            {forgotStep === 1 && (
              <p className="text-xs text-gray-500 font-semibold mb-6">
                Enter your registered email address or 10-digit Indian phone number. We will send you instructions to reset your password.
              </p>
            )}

            {forgotStep === 2 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 font-semibold mb-2">
                  Enter the 6-digit OTP code sent to your mobile phone number <strong>{forgotPhone}</strong>.
                </p>
                <div className="flex justify-between items-center bg-blue-50 text-blue-800 px-3.5 py-2 rounded-xl text-xs font-bold border border-blue-100">
                  <span>⏳ OTP Expiry Countdown</span>
                  <span className="font-black text-sm">{formatTime(otpExpiryTime)}</span>
                </div>
              </div>
            )}

            {forgotStep === 3 && (
              <p className="text-xs text-gray-500 font-semibold mb-6">
                Please create a secure new password for your account.
              </p>
            )}

            {forgotSuccess && (
              <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 mb-6 text-xs font-medium text-center">
                {forgotSuccess}
              </div>
            )}
            {forgotError && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6 text-xs font-medium text-center">
                {forgotError}
              </div>
            )}

            {forgotStep === 1 && (
              <form onSubmit={handleRequestRecoveryOtp} className="space-y-4">
                <div className="form-group">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Email or Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter email or 10-digit phone"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none transition-all font-medium text-gray-800"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotStep(1);
                      setForgotEmail('');
                      setForgotPhone('');
                      setForgotOtp('');
                      setForgotResetToken('');
                      setForgotSuccess('');
                      setForgotError('');
                      setOtpExpiryTime(0);
                      setShowNewPassword(false);
                      setShowConfirmNewPassword(false);
                    }}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl border-none cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingReset}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-extrabold rounded-xl border-none cursor-pointer transition-all shadow-md"
                  >
                    {sendingReset ? "Sending..." : "Send Reset"}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleVerifyRecoveryOtp} className="space-y-4">
                <div className="form-group">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Verification OTP</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={forgotOtp}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setForgotOtp(val);
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none transition-all font-black text-center text-xl tracking-widest text-gray-800"
                  />
                </div>

                <div className="flex gap-2 text-xs font-semibold justify-center">
                  <span className="text-gray-400">Didn't receive the OTP?</span>
                  {cooldownTime > 0 ? (
                    <span className="text-gray-500">Resend in {cooldownTime}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestRecoveryOtp}
                      className="text-green-600 hover:text-green-700 font-bold border-none bg-transparent cursor-pointer underline"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setForgotOtp('');
                      setForgotSuccess('');
                      setForgotError('');
                      setOtpExpiryTime(0);
                    }}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl border-none cursor-pointer transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={sendingReset}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-extrabold rounded-xl border-none cursor-pointer transition-all shadow-md"
                  >
                    {sendingReset ? "Verifying..." : "Verify Code"}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div className="form-group">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none transition-all font-medium text-gray-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer p-1 flex items-center justify-center transition-colors"
                      style={{ zIndex: 10 }}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmNewPassword ? "text" : "password"}
                      required
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                      className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none transition-all font-medium text-gray-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer p-1 flex items-center justify-center transition-colors"
                      style={{ zIndex: 10 }}
                    >
                      {showConfirmNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Checklist */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs space-y-1.5">
                  <p className="font-bold text-gray-600 mb-1 ml-0.5">Password Requirements:</p>
                  <div className="flex items-center gap-1.5">
                    <span className={newPassword.length >= 8 ? "text-green-600 font-bold" : "text-gray-400"}>
                      {newPassword.length >= 8 ? "✓" : "•"} At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={/[A-Z]/.test(newPassword) ? "text-green-600 font-bold" : "text-gray-400"}>
                      {/[A-Z]/.test(newPassword) ? "✓" : "•"} At least one uppercase letter (A-Z)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={/[a-z]/.test(newPassword) ? "text-green-600 font-bold" : "text-gray-400"}>
                      {/[a-z]/.test(newPassword) ? "✓" : "•"} At least one lowercase letter (a-z)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={/\d/.test(newPassword) ? "text-green-600 font-bold" : "text-gray-400"}>
                      {/\d/.test(newPassword) ? "✓" : "•"} At least one number (0-9)
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotEmail('');
                      setForgotPhone('');
                      setForgotOtp('');
                      setForgotResetToken('');
                      setNewPassword('');
                      setConfirmNewPassword('');
                      setForgotStep(1);
                      setShowNewPassword(false);
                      setShowConfirmNewPassword(false);
                    }}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl border-none cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingReset}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-extrabold rounded-xl border-none cursor-pointer transition-all shadow-md"
                  >
                    {sendingReset ? "Updating..." : "Reset Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showRegisterOtpModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-gray-150 shadow-2xl relative animate-fade-in">
            <h3 className="text-2xl font-black text-gray-900 mb-2">Verify Mobile</h3>
            <p className="text-xs text-gray-500 font-semibold mb-2">
              Enter the 6-digit OTP code sent to your phone <strong>{formData.phoneOrEmail}</strong>.
            </p>
            <div className="flex justify-between items-center bg-blue-50 text-blue-800 px-3.5 py-2 rounded-xl text-xs font-bold border border-blue-100 mb-4">
              <span>⏳ OTP Expiry Countdown</span>
              <span className="font-black text-sm">{formatTime(registerExpiry)}</span>
            </div>
            
            {registerSuccess && (
              <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 mb-4 text-xs font-medium text-center">
                {registerSuccess}
              </div>
            )}
            {registerError && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-4 text-xs font-medium text-center">
                {registerError}
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setRegisterError('');
              setRegisterSuccess('');
              const phoneVal = formData.phoneOrEmail.trim();
              try {
                if (smsProvider === 'FIREBASE' && confirmationResult) {
                  const result = await confirmationResult.confirm(registerOtp);
                  const idToken = await result.user.getIdToken();
                  
                  // Call register-firebase to create the account in both Firebase and SQLite
                  await authAPI.registerFirebase({
                    phone: phoneVal,
                    name: formData.name,
                    password: formData.password,
                    role: formData.role,
                    firebase_id_token: idToken,
                    lat: 10.0,
                    lng: 76.0
                  });
                  
                  setShowRegisterOtpModal(false);
                  setConfirmationResult(null);
                  
                  // Log out of the temporary phone authentication session
                  await auth.signOut();
                  
                  // Sign in with the newly created email/password account
                  const authEmail = `${phoneVal}@naadan.com`;
                  await handleActionWithLocation(() => signInWithEmailAndPassword(auth, authEmail, formData.password));
                } else {
                  const res = await authAPI.registerVerifyOtp(phoneVal, registerOtp);
                  setRegisterToken(res.data.registration_token);
                  setShowRegisterOtpModal(false);
                  
                  // complete signup in Firebase
                  const authEmail = `${phoneVal}@naadan.com`;
                  handleActionWithLocation(() => createUserWithEmailAndPassword(auth, authEmail, formData.password));
                }
              } catch (err) {
                console.error(err);
                const errMsg = err.response?.data?.msg || err.message || "Invalid OTP. Please check and try again.";
                setRegisterError(errMsg.replace('Firebase: ', ''));
                setLoading(false);
              }
            }} className="space-y-4">
              <div className="form-group">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Verification OTP</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={registerOtp}
                  onChange={e => setRegisterOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-green-500 focus:bg-white outline-none transition-all font-black text-center text-xl tracking-widest text-gray-800"
                />
              </div>

              <div className="flex gap-2 text-xs font-semibold justify-center">
                <span className="text-gray-400">Didn't receive the OTP?</span>
                {registerCooldown > 0 ? (
                  <span className="text-gray-500">Resend in {registerCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      setRegisterError('');
                      setRegisterSuccess('');
                      try {
                        const phoneVal = formData.phoneOrEmail.trim();
                        if (smsProvider === 'FIREBASE') {
                          setupRecaptcha();
                          const appVerifier = window.recaptchaVerifier;
                          const formattedPhone = '+91' + phoneVal;
                          const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
                          setConfirmationResult(confirmation);
                          setRegisterSuccess("OTP resent successfully via Firebase.");
                        } else {
                          await authAPI.registerRequestOtp(phoneVal);
                          setRegisterSuccess("OTP resent successfully.");
                        }
                        setRegisterCooldown(60);
                        setRegisterExpiry(300);
                      } catch (err) {
                        console.error(err);
                        const errMsg = err.response?.data?.msg || err.message || "Failed to resend OTP.";
                        setRegisterError(errMsg.replace('Firebase: ', ''));
                      }
                    }}
                    className="text-green-600 hover:text-green-700 font-bold border-none bg-transparent cursor-pointer underline"
                  >
                    Resend OTP
                  </button>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRegisterOtpModal(false);
                    setRegisterOtp('');
                    setRegisterToken('');
                    setRegisterSuccess('');
                    setRegisterError('');
                    setRegisterExpiry(0);
                    setConfirmationResult(null);
                  }}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl border-none cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-extrabold rounded-xl border-none cursor-pointer transition-all shadow-md"
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div id="recaptcha-container"></div>
    </div>
  );
};

export default Auth;

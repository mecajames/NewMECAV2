import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-gray-400">Last updated: November 16, 2025</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-8 space-y-8">
          {/* Privacy Notice */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">PRIVACY NOTICE</h2>
            <p className="text-gray-300 mb-4">
              This privacy notice for MECA Inc. ("Company," "we," "us," or "our"), describes how and why we might collect, store, use, and/or share ("process") your information when you use our services ("Services"), such as when you:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Visit our website at mecacaraudio.com, or any website of ours that links to this privacy notice</li>
              <li>Engage with us in other related ways, including any sales, marketing, or events</li>
            </ul>
            <p className="text-gray-300 mt-4">
              <strong>Questions or concerns?</strong> Reading this privacy notice will help you understand your privacy rights and choices. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at <span className="text-gray-300">mecacaraudio [at] gmail [dot] com</span>.
            </p>
          </div>

          {/* Summary of Key Points */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">SUMMARY OF KEY POINTS</h2>
            <div className="text-gray-300 space-y-3">
              <p><strong>What personal information do we process?</strong> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with MECA Inc. and the Services, the choices you make, and the products and features you use.</p>
              <p><strong>Do we process any sensitive personal information?</strong> We do not process sensitive personal information.</p>
              <p><strong>Do you receive any information from third parties?</strong> We do not receive any information from third parties.</p>
              <p><strong>How do you process my information?</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent. We process your information only when we have a valid legal reason to do so.</p>
              <p><strong>In what situations and with which types of parties do we share personal information?</strong> We may share information in specific situations and with specific categories of third parties.</p>
              <p><strong>How do we keep your information safe?</strong> We have organizational and technical processes and procedures in place to protect your personal information. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information.</p>
              <p><strong>What are your rights?</strong> Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information.</p>
              <p><strong>How do I exercise my rights?</strong> The easiest way to exercise your rights is by <Link to="/contact" className="text-orange-500 hover:text-orange-400">contacting us</Link>. We will consider and act upon any request in accordance with applicable data protection laws.</p>
            </div>
          </div>

          {/* Table of Contents */}
          <div id="table-of-contents">
            <h2 className="text-2xl font-bold text-white mb-4">TABLE OF CONTENTS</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-2 ml-4">
              <li><a href="#section-1" className="text-orange-500 hover:text-orange-400 hover:underline">WHAT INFORMATION DO WE COLLECT?</a></li>
              <li><a href="#section-2" className="text-orange-500 hover:text-orange-400 hover:underline">HOW DO WE PROCESS YOUR INFORMATION?</a></li>
              <li><a href="#section-3" className="text-orange-500 hover:text-orange-400 hover:underline">WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?</a></li>
              <li><a href="#section-4" className="text-orange-500 hover:text-orange-400 hover:underline">WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</a></li>
              <li><a href="#section-5" className="text-orange-500 hover:text-orange-400 hover:underline">DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?</a></li>
              <li><a href="#section-6" className="text-orange-500 hover:text-orange-400 hover:underline">HOW LONG DO WE KEEP YOUR INFORMATION?</a></li>
              <li><a href="#section-7" className="text-orange-500 hover:text-orange-400 hover:underline">HOW DO WE KEEP YOUR INFORMATION SAFE?</a></li>
              <li><a href="#section-8" className="text-orange-500 hover:text-orange-400 hover:underline">DO WE COLLECT INFORMATION FROM MINORS?</a></li>
              <li><a href="#section-9" className="text-orange-500 hover:text-orange-400 hover:underline">WHAT ARE YOUR PRIVACY RIGHTS?</a></li>
              <li><a href="#section-10" className="text-orange-500 hover:text-orange-400 hover:underline">CONTROLS FOR DO-NOT-TRACK FEATURES</a></li>
              <li><a href="#section-11" className="text-orange-500 hover:text-orange-400 hover:underline">DO CALIFORNIA RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</a></li>
              <li><a href="#section-12" className="text-orange-500 hover:text-orange-400 hover:underline">DO WE MAKE UPDATES TO THIS NOTICE?</a></li>
              <li><a href="#section-13" className="text-orange-500 hover:text-orange-400 hover:underline">HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</a></li>
              <li><a href="#section-14" className="text-orange-500 hover:text-orange-400 hover:underline">HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</a></li>
            </ol>
          </div>

          {/* 1. What Information Do We Collect */}
          <div id="section-1">
            <h2 className="text-2xl font-bold text-white mb-4">1. WHAT INFORMATION DO WE COLLECT?</h2>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Personal information you disclose to us</h3>
            <p className="text-gray-300 mb-3"><em>In Short: We collect personal information that you provide to us.</em></p>
            <p className="text-gray-300 mb-3">
              We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.
            </p>
            <p className="text-gray-300 mb-3">
              <strong>Personal Information Provided by You.</strong> The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make, and the products and features you use. The personal information we collect may include the following:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4 mb-3">
              <li>names</li>
              <li>phone numbers</li>
              <li>email addresses</li>
              <li>mailing addresses</li>
              <li>usernames</li>
              <li>passwords</li>
              <li>contact preferences</li>
              <li>contact or authentication data</li>
              <li>billing addresses</li>
              <li>vehicle and license plate number</li>
            </ul>
            <p className="text-gray-300 mb-3">
              <strong>Sensitive Information.</strong> We do not process sensitive information.
            </p>
            <p className="text-gray-300 mb-3">
              <strong>Payment Data.</strong> We may collect data necessary to process your payment if you make purchases, such as your payment instrument number (such as a credit card number), and the security code associated with your payment instrument. All payment data is stored by Stripe and PayPal. You may find their privacy notice link(s) here: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400">https://stripe.com/privacy</a> and <a href="https://www.paypal.com/us/webapps/mpp/ua/privacy-full" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400">https://www.paypal.com/us/webapps/mpp/ua/privacy-full</a>.
            </p>
            <p className="text-gray-300">
              All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes to such personal information.
            </p>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Information automatically collected</h3>
            <p className="text-gray-300 mb-3"><em>In Short: Some information — such as your Internet Protocol (IP) address and/or browser and device characteristics — is collected automatically when you visit our Services.</em></p>
            <p className="text-gray-300 mb-3">
              We automatically collect certain information when you visit, use, or navigate the Services. This information does not reveal your specific identity (like your name or contact information) but may include device and usage information, such as your IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, location, information about how and when you use our Services, and other technical information. This information is primarily needed to maintain the security and operation of our Services, and for our internal analytics and reporting purposes.
            </p>
            <p className="text-gray-300 mb-3">
              Like many businesses, we also collect information through cookies and similar technologies.
            </p>
            <p className="text-gray-300 mb-3">The information we collect includes:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Log and Usage Data.</strong> Log and usage data is service-related, diagnostic, usage, and performance information our servers automatically collect when you access or use our Services and which we record in log files. Depending on how you interact with us, this log data may include your IP address, device information, browser type, and settings and information about your activity in the Services (such as the date/time stamps associated with your usage, pages and files viewed, searches, and other actions you take such as which features you use), device event information (such as system activity, error reports (sometimes called "crash dumps"), and hardware settings).</li>
              <li><strong>Device Data.</strong> We collect device data such as information about your computer, phone, tablet, or other device you use to access the Services. Depending on the device used, this device data may include information such as your IP address (or proxy server), device and application identification numbers, location, browser type, hardware model, Internet service provider and/or mobile carrier, operating system, and system configuration information.</li>
              <li><strong>Location Data.</strong> We collect location data such as information about your device's location, which can be either precise or imprecise. How much information we collect depends on the type and settings of the device you use to access the Services. For example, we may use GPS and other technologies to collect geolocation data that tells us your current location (based on your IP address). You can opt out of allowing us to collect this information either by refusing access to the information or by disabling your Location setting on your device. However, if you choose to opt out, you may not be able to use certain aspects of the Services.</li>
            </ul>
            <a href="#table-of-contents" className="text-orange-500 hover:text-orange-400 text-sm">↑ Back to Top</a>
          </div>

          {/* 2. How Do We Process Your Information */}
          <div id="section-2">
            <h2 className="text-2xl font-bold text-white mb-4">2. HOW DO WE PROCESS YOUR INFORMATION?</h2>
            <p className="text-gray-300 mb-3"><em>In Short: We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent.</em></p>
            <p className="text-gray-300 mb-3">We process your personal information for a variety of reasons, depending on how you interact with our Services, including:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>To facilitate account creation and authentication and otherwise manage user accounts. We may process your information so you can create and log in to your account, as well as keep your account in working order.</li>
              <li>To deliver and facilitate delivery of services to the user. We may process your information to provide you with the requested service.</li>
              <li>To respond to user inquiries/offer support to users. We may process your information to respond to your inquiries and solve any potential issues you might have with the requested service.</li>
              <li>To send administrative information to you. We may process your information to send you details about our products and services, changes to our terms and policies, and other similar information.</li>
              <li>To fulfill and manage your orders. We may process your information to fulfill and manage your orders, payments, returns, and exchanges made through the Services.</li>
              <li>To request feedback. We may process your information when necessary to request feedback and to contact you about your use of our Services.</li>
              <li>To send you marketing and promotional communications. We may process the personal information you send to us for our marketing purposes, if this is in accordance with your marketing preferences. You can opt out of our marketing emails at any time. For more information, see "WHAT ARE YOUR PRIVACY RIGHTS?" below).</li>
              <li>To deliver targeted advertising to you. We may process your information to develop and display personalized content and advertising tailored to your interests, location, and more.</li>
              <li>To protect our Services. We may process your information as part of our efforts to keep our Services safe and secure, including fraud monitoring and prevention.</li>
              <li>To identify usage trends. We may process information about how you use our Services to better understand how they are being used so we can improve them.</li>
              <li>To determine the effectiveness of our marketing and promotional campaigns. We may process your information to better understand how to provide marketing and promotional campaigns that are most relevant to you.</li>
              <li>To save or protect an individual's vital interest. We may process your information when necessary to save or protect an individual's vital interest, such as to prevent harm.</li>
            </ul>
            <a href="#table-of-contents" className="text-orange-500 hover:text-orange-400 text-sm">↑ Back to Top</a>
          </div>

          {/* 3. Legal Bases */}
          <div id="section-3">
            <h2 className="text-2xl font-bold text-white mb-4">3. WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?</h2>
            <p className="text-gray-300 mb-3"><em>In Short: We only process your personal information when we believe it is necessary and we have a valid legal reason (i.e., legal basis) to do so under applicable law, like with your consent, to comply with laws, to provide you with services to enter into or fulfill our contractual obligations, to protect your rights, or to fulfill our legitimate business interests.</em></p>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">If you are located in the EU or UK, this section applies to you.</h3>
            <p className="text-gray-300 mb-3">
              The General Data Protection Regulation (GDPR) and UK GDPR require us to explain the valid legal bases we rely on in order to process your personal information. As such, we may rely on the following legal bases to process your personal information:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-6">
              <li><strong>Consent.</strong> We may process your information if you have given us permission (i.e., consent) to use your personal information for a specific purpose.</li>
              <li><strong>Performance of a Contract.</strong> We may process your personal information when we believe it is necessary to fulfill our contractual obligations to you, including providing our Services or at your request prior to entering into a contract with you.</li>
              <li><strong>Legitimate Interests.</strong> We may process your information when we believe it is reasonably necessary to achieve our legitimate business interests and those interests do not outweigh your interests and fundamental rights and freedoms. For example, we may process your personal information for some of the purposes described in order to:
                <ul className="list-circle list-inside ml-6 mt-2 space-y-1">
                  <li>Send users information about special offers and discounts on our products and services</li>
                  <li>Develop and display personalized and relevant advertising content for our users</li>
                  <li>Analyze how our services are used so we can improve them to engage and retain users</li>
                  <li>Support our marketing activities</li>
                  <li>Diagnose problems and/or prevent fraudulent activities</li>
                  <li>Understand how our users use our products and services so we can improve user experience</li>
                </ul>
              </li>
              <li><strong>Legal Obligations.</strong> We may process your information where we believe it is necessary for compliance with our legal obligations, such as to cooperate with a law enforcement body or regulatory agency, exercise or defend our legal rights, or disclose your information as evidence in litigation in which we are involved.</li>
              <li><strong>Vital Interests.</strong> We may process your information where we believe it is necessary to protect your vital interests or the vital interests of a third party, such as situations involving potential threats to the safety of any person.</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">If you are located in Canada, this section applies to you.</h3>
            <p className="text-gray-300 mb-3">
              We may process your information if you have given us specific permission (i.e., express consent) to use your personal information for a specific purpose, or in situations where your permission can be inferred (i.e., implied consent). You can withdraw your consent at any time.
            </p>
            <p className="text-gray-300 mb-3">In some exceptional cases, we may be legally permitted under applicable law to process your information without your consent, including, for example:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
              <li>If collection is clearly in the interests of an individual and consent cannot be obtained in a timely way</li>
              <li>For investigations and fraud detection and prevention</li>
              <li>For business transactions provided certain conditions are met</li>
              <li>If it is contained in a witness statement and the collection is necessary to assess, process, or settle an insurance claim</li>
              <li>For identifying injured, ill, or deceased persons and communicating with next of kin</li>
              <li>If we have reasonable grounds to believe an individual has been, is, or may be victim of financial abuse</li>
              <li>If it is reasonable to expect collection and use with consent would compromise the availability or the accuracy of the information and the collection is reasonable for purposes related to investigating a breach of an agreement or a contravention of the laws of Canada or a province</li>
              <li>If disclosure is required to comply with a subpoena, warrant, court order, or rules of the court relating to the production of records</li>
              <li>If it was produced by an individual in the course of their employment, business, or profession and the collection is consistent with the purposes for which the information was produced</li>
              <li>If the collection is solely for journalistic, artistic, or literary purposes</li>
              <li>If the information is publicly available and is specified by the regulations</li>
            </ul>
            <a href="#table-of-contents" className="text-orange-500 hover:text-orange-400 text-sm">↑ Back to Top</a>
          </div>

          {/* 4. When and With Whom */}
          <div id="section-4">
            <h2 className="text-2xl font-bold text-white mb-4">4. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</h2>
            <p className="text-gray-300 mb-3"><em>In Short: We may share information in specific situations described in this section and/or with the following categories of third parties.</em></p>
            <p className="text-gray-300 mb-3">
              <strong>Vendors, Consultants, and Other Third-Party Service Providers.</strong> We may share your data with third-party vendors, service providers, contractors, or agents ("third parties") who perform services for us or on our behalf and require access to such information to do that work. We have contracts in place with our third parties, which are designed to help safeguard your personal information. This means that they cannot do anything with your personal information unless we have instructed them to do it. They will also not share your personal information with any organization apart from us. They also commit to protect the data they hold on our behalf and to retain it for the period we instruct. The categories of third parties we may share personal information with are as follows:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4 mb-4">
              <li>Ad Networks</li>
              <li>Affiliate Marketing Programs</li>
              <li>Cloud Computing Services</li>
              <li>Data Analytics Services</li>
              <li>Data Storage Service Providers</li>
              <li>Finance & Accounting Tools</li>
              <li>Order Fulfillment Service Providers</li>
              <li>Payment Processors</li>
              <li>Performance Monitoring Tools</li>
              <li>Retargeting Platforms</li>
              <li>Sales & Marketing Tools</li>
              <li>Social Networks</li>
              <li>User Account Registration & Authentication Services</li>
              <li>Website Hosting Service Providers</li>
            </ul>
            <p className="text-gray-300 mb-3">We also may need to share your personal information in the following situations:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li><strong>Business Transfers.</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</li>
              <li><strong>When we use Google Maps Platform APIs.</strong> We may share your information with certain Google Maps Platform APIs (e.g., Google Maps API, Places API). To find out more about Google's Privacy Policy, please refer to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400">this link</a>. We obtain and store on your device ('cache') your location. You may revoke your consent anytime by contacting us at the contact details provided at the end of this document.</li>
              <li><strong>Affiliates.</strong> We may share your information with our affiliates, in which case we will require those affiliates to honor this privacy notice. Affiliates include our parent company and any subsidiaries, joint venture partners, or other companies that we control or that are under common control with us.</li>
              <li><strong>Business Partners.</strong> We may share your information with our business partners to offer you certain products, services, or promotions.</li>
            </ul>
            <a href="#table-of-contents" className="text-orange-500 hover:text-orange-400 text-sm">↑ Back to Top</a>
          </div>

          {/* 5. Cookies */}
          <div id="section-5">
            <h2 className="text-2xl font-bold text-white mb-4">5. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?</h2>
            <p className="text-gray-300"><em>In Short: We may use cookies and other tracking technologies to collect and store your information.</em></p>
            <p className="text-gray-300 mt-3">
              We may use cookies and similar tracking technologies (like web beacons and pixels) to access or store information. Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Notice.
</p>
            <a href="#table-of-contents" className="text-orange-500 hover:text-orange-400 text-sm">↑ Back to Top</a>
          </div>

          {/* 6. How Long */}
          <div id="section-6">
            <h2 className="text-2xl font-bold text-white mb-4">6. HOW LONG DO WE KEEP YOUR INFORMATION?</h2>
            <p className="text-gray-300 mb-3"><em>In Short: We keep your information for as long as necessary to fulfill the purposes outlined in this privacy notice unless otherwise required by law.</em></p>
            <p className="text-gray-300 mb-3">
              We will only keep your personal information for as long as it is necessary for the purposes set out in this privacy notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements). No purpose in this notice will require us keeping your personal information for longer than the period of time in which users have an account with us.
            </p>
            <p className="text-gray-300">
              When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information, or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible.
</p>
            <a href="#table-of-contents" className="text-orange-500 hover:text-orange-400 text-sm">↑ Back to Top</a>
          </div>

          {/* 7. How We Keep Safe */}
          <div id="section-7">
            <h2 className="text-2xl font-bold text-white mb-4">7. HOW DO WE KEEP YOUR INFORMATION SAFE?</h2>
            <p className="text-gray-300 mb-3"><em>In Short: We aim to protect your personal information through a system of organizational and technical security measures.</em></p>
            <p className="text-gray-300">
              We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Although we will do our best to protect your personal information, transmission of personal information to and from our Services is at your own risk. You should only access the Services within a secure environment.
</p>
            <a href="#table-of-contents" className="text-orange-500 hover:text-orange-400 text-sm">↑ Back to Top</a>
          </div>

          {/* 8. Minors */}
          <div id="section-8">
            <h2 className="text-2xl font-bold text-white mb-4">8. DO WE COLLECT INFORMATION FROM MINORS?</h2>
            <p className="text-gray-300 mb-3"><em>In Short: We do not knowingly collect data from or market to children under 18 years of age.</em></p>
            <p className="text-gray-300">
              We do not knowingly solicit data from or market to children under 18 years of age. By using the Services, you represent that you are at least 18 or that you are the parent or guardian of such a minor and consent to such minor dependent's use of the Services. If we learn that personal information from users less than 18 years of age has been collected, we will deactivate the account and take reasonable measures to promptly delete such data from our records. If you become aware of any data we may have collected from children under age 18, please contact us at <span className="text-gray-300">mecacaraudio [at] gmail [dot] com</span>.
</p>
            <a href="#table-of-contents" className="text-orange-500 hover:text-orange-400 text-sm">↑ Back to Top</a>
          </div>

          {/* 9. Privacy Rights */}
          <div id="section-9">
            <h2 className="text-2xl font-bold text-white mb-4">9. WHAT ARE YOUR PRIVACY RIGHTS?</h2>
            <p className="text-gray-300 mb-3"><em>In Short: In some regions, such as the European Economic Area (EEA), United Kingdom (UK), and Canada, you have rights that allow you greater access to and control over your personal information. You may review, change, or terminate your account at any time.</em></p>
            <p className="text-gray-300 mb-3">
              In some regions (like the EEA, UK, and Canada), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; and (iv) if applicable, to data portability. In certain circumstances, you may also have the right to object to the processing of your personal information. You can make such a request by contacting us by using the contact details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?" below.
            </p>
            <p className="text-gray-300 mb-3">
              We will consider and act upon any request in accordance with applicable data protection laws.
            </p>
            <p className="text-gray-300 mb-3">
              If you are located in the EEA or UK and you believe we are unlawfully processing your personal information, you also have the right to complain to your local data protection supervisory authority. You can find their contact details here: <a href="https://ec.europa.eu/justice/data-protection/bodies/authorities/index_en.htm" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400">https://ec.europa.eu/justice/data-protection/bodies/authorities/index_en.htm</a>.
            </p>
            <p className="text-gray-300 mb-3">
              If you are located in Switzerland, the contact details for the data protection authorities are available here: <a href="https://www.edoeb.admin.ch/edoeb/en/home.html" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400">https://www.edoeb.admin.ch/edoeb/en/home.html</a>.
            </p>
            <p className="text-gray-300 mb-3">
              <strong>Withdrawing your consent:</strong> If we are relying on your consent to process your personal information, which may be express and/or implied consent depending on the applicable law, you have the right to withdraw your consent at any time. You can withdraw your consent at any time by contacting us by using the contact details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?" below.
            </p>
            <p className="text-gray-300 mb-3">
              However, please note that this will not affect the lawfulness of the processing before its withdrawal, nor when applicable law allows, will it affect the processing of your personal information conducted in reliance on lawful processing grounds other than consent.
            </p>
            <p className="text-gray-300 mb-3">
              <strong>Opting out of marketing and promotional communications:</strong> You can unsubscribe from our marketing and promotional communications at any time by clicking on the unsubscribe link in the emails that we send, replying "STOP" or "UNSUBSCRIBE" to the SMS messages that we send, or by contacting us using the details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?" below. You will then be removed from the marketing lists. However, we may still communicate with you — for example, to send you service-related messages that are necessary for the administration and use of your account, to respond to service requests, or for other non-marketing purposes.
            </p>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Account Information</h3>
            <p className="text-gray-300 mb-3">If you would at any time like to review or change the information in your account or terminate your account, you can:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4 mb-3">
              <li>Log in to your account settings and update your user account.</li>
            </ul>
            <p className="text-gray-300 mb-3">
              Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, we may retain some information in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our legal terms and/or comply with applicable legal requirements.
            </p>
            <p className="text-gray-300 mb-3">
              <strong>Cookies and similar technologies:</strong> Most Web browsers are set to accept cookies by default. If you prefer, you can usually choose to set your browser to remove cookies and to reject cookies. If you choose to remove cookies or reject cookies, this could affect certain features or services of our Services. To opt out of interest-based advertising by advertisers on our Services visit <a href="http://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400">http://www.aboutads.info/choices/</a>.
            </p>
            <p className="text-gray-300">
              If you have questions or comments about your privacy rights, you may email us at <span className="text-gray-300">mecacaraudio [at] gmail [dot] com</span>.
            </p>
            <a href="#table-of-contents" className="text-orange-500 hover:text-orange-400 text-sm">↑ Back to Top</a>
          </div>

          {/* 10. Do-Not-Track */}
          <div id="section-10">
            <h2 className="text-2xl font-bold text-white mb-4">10. CONTROLS FOR DO-NOT-TRACK FEATURES</h2>
            <p className="text-gray-300">
              Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard for online tracking is adopted that we must follow in the future, we will inform you about that practice in a revised version of this privacy notice.
</p>
            <a href="#table-of-contents" className="text-orange-500 hover:text-orange-400 text-sm">↑ Back to Top</a>
          </div>

          {/* 11. California Residents */}
          <div id="section-11">
            <h2 className="text-2xl font-bold text-white mb-4">11. DO CALIFORNIA RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</h2>
            <p className="text-gray-300 mb-3"><em>In Short: Yes, if you are a resident of California, you are granted specific rights regarding access to your personal information.</em></p>
            <p className="text-gray-300 mb-3">
              California Civil Code Section 1798.83, also known as the "Shine The Light" law, permits our users who are California residents to request and obtain from us, once a year and free of charge, information about categories of personal information (if any) we disclosed to third parties for direct marketing purposes and the names and addresses of all third parties with which we shared personal information in the immediately preceding calendar year. If you are a California resident and would like to make such a request, please submit your request in writing to us using the contact information provided below.
            </p>
            <p className="text-gray-300 mb-3">
              If you are under 18 years of age, reside in California, and have a registered account with Services, you have the right to request removal of unwanted data that you publicly post on the Services. To request removal of such data, please contact us using the contact information provided below and include the email address associated with your account and a statement that you reside in California. We will make sure the data is not publicly displayed on the Services, but please be aware that the data may not be completely or comprehensively removed from all our systems (e.g., backups, etc.).
            </p>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">CCPA Privacy Notice</h3>
            <p className="text-gray-300 mb-3">The California Code of Regulations defines a "resident" as:</p>
            <p className="text-gray-300 mb-3">(1) every individual who is in the State of California for other than a temporary or transitory purpose and</p>
            <p className="text-gray-300 mb-3">(2) every individual who is domiciled in the State of California who is outside the State of California for a temporary or transitory purpose</p>
            <p className="text-gray-300 mb-3">All other individuals are defined as "non-residents."</p>
            <p className="text-gray-300 mb-3">If this definition of "resident" applies to you, we must adhere to certain rights and obligations regarding your personal information.</p>

            <h4 className="text-lg font-semibold text-white mb-3 mt-4">What categories of personal information do we collect?</h4>
            <p className="text-gray-300 mb-3">We have collected the following categories of personal information in the past twelve (12) months:</p>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full text-gray-300 border border-slate-700">
                <thead>
                  <tr className="bg-slate-700">
                    <th className="px-4 py-2 border border-slate-600 text-left">Category</th>
                    <th className="px-4 py-2 border border-slate-600 text-left">Examples</th>
                    <th className="px-4 py-2 border border-slate-600 text-left">Collected</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 border border-slate-700">A. Identifiers</td>
                    <td className="px-4 py-2 border border-slate-700">Contact details, such as real name, alias, postal address, telephone or mobile contact number, unique personal identifier, online identifier, Internet Protocol address, email address, and account name</td>
                    <td className="px-4 py-2 border border-slate-700">YES</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-slate-700">B. Personal information categories listed in the California Customer Records statute</td>
                    <td className="px-4 py-2 border border-slate-700">Name, contact information, education, employment, employment history, and financial information</td>
                    <td className="px-4 py-2 border border-slate-700">YES</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-slate-700">C. Protected classification characteristics under California or federal law</td>
                    <td className="px-4 py-2 border border-slate-700">Gender and date of birth</td>
                    <td className="px-4 py-2 border border-slate-700">NO</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-slate-700">D. Commercial information</td>
                    <td className="px-4 py-2 border border-slate-700">Transaction information, purchase history, financial details, and payment information</td>
                    <td className="px-4 py-2 border border-slate-700">YES</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-slate-700">E. Biometric information</td>
                    <td className="px-4 py-2 border border-slate-700">Fingerprints and voiceprints</td>
                    <td className="px-4 py-2 border border-slate-700">NO</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-slate-700">F. Internet or other similar network activity</td>
                    <td className="px-4 py-2 border border-slate-700">Browsing history, search history, online behavior, interest data, and interactions with our and other websites, applications, systems, and advertisements</td>
                    <td className="px-4 py-2 border border-slate-700">YES</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-slate-700">G. Geolocation data</td>
                    <td className="px-4 py-2 border border-slate-700">Device location</td>
                    <td className="px-4 py-2 border border-slate-700">YES</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-slate-700">H. Audio, electronic, visual, thermal, olfactory, or similar information</td>
                    <td className="px-4 py-2 border border-slate-700">Images and audio, video or call recordings created in connection with our business activities</td>
                    <td className="px-4 py-2 border border-slate-700">NO</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-slate-700">I. Professional or employment-related information</td>
                    <td className="px-4 py-2 border border-slate-700">Business contact details in order to provide you our services at a business level or job title, work history, and professional qualifications if you apply for a job with us</td>
                    <td className="px-4 py-2 border border-slate-700">NO</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-slate-700">J. Education Information</td>
                    <td className="px-4 py-2 border border-slate-700">Student records and directory information</td>
                    <td className="px-4 py-2 border border-slate-700">NO</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-slate-700">K. Inferences drawn from other personal information</td>
                    <td className="px-4 py-2 border border-slate-700">Inferences drawn from any of the collected personal information listed above to create a profile or summary about, for example, an individual's preferences and characteristics</td>
                    <td className="px-4 py-2 border border-slate-700">NO</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-gray-300 mb-3">We may also collect other personal information outside of these categories instances where you interact with us in person, online, or by phone or mail in the context of:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4 mb-4">
              <li>Receiving help through our customer support channels;</li>
              <li>Participation in customer surveys or contests; and</li>
              <li>Facilitation in the delivery of our Services and to respond to your inquiries.</li>
            </ul>

            <h4 className="text-lg font-semibold text-white mb-3 mt-4">How do we use and share your personal information?</h4>
            <p className="text-gray-300 mb-3">MECA Inc. collects and shares your personal information through:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4 mb-4">
              <li>Targeting cookies/Marketing cookies</li>
              <li>Social media cookies</li>
              <li>Beacons/Pixels/Tags</li>
            </ul>
            <p className="text-gray-300 mb-3">More information about our data collection and sharing practices can be found in this privacy notice.</p>
            <p className="text-gray-300 mb-3">You may contact us by visiting <Link to="/contact" className="text-orange-500 hover:text-orange-400">our contact page</Link>, or by referring to the contact details at the bottom of this document.</p>
            <p className="text-gray-300 mb-3">If you are using an authorized agent to exercise your right to opt out we may deny a request if the authorized agent does not submit proof that they have been validly authorized to act on your behalf.</p>

            <h4 className="text-lg font-semibold text-white mb-3 mt-4">Will your information be shared with anyone else?</h4>
            <p className="text-gray-300 mb-3">We may disclose your personal information with our service providers pursuant to a written contract between us and each service provider. Each service provider is a for-profit entity that processes the information on our behalf.</p>
            <p className="text-gray-300 mb-3">We may use your personal information for our own business purposes, such as for undertaking internal research for technological development and demonstration. This is not considered to be "selling" of your personal information.</p>
            <p className="text-gray-300 mb-3">MECA Inc. has not sold any personal information to third parties for a business or commercial purpose in the preceding twelve (12) months. MECA Inc. has disclosed the following categories of personal information to third parties for a business or commercial purpose in the preceding twelve (12) months:</p>
            <p className="text-gray-300 mb-4">Category B. Personal information, as defined in the California Customer Records law, such as your name, contact information, education, employment, employment history, and financial information.</p>

            <h4 className="text-lg font-semibold text-white mb-3 mt-4">Your rights with respect to your personal data</h4>
            <p className="text-gray-300 mb-3"><strong>Right to request deletion of the data — Request to delete</strong></p>
            <p className="text-gray-300 mb-4">You can ask for the deletion of your personal information. If you ask us to delete your personal information, we will respect your request and delete your personal information, subject to certain exceptions provided by law, such as (but not limited to) the exercise by another consumer of his or her right to free speech, our compliance requirements resulting from a legal obligation, or any processing that may be required to protect against illegal activities.</p>

            <p className="text-gray-300 mb-3"><strong>Right to be informed — Request to know</strong></p>
            <p className="text-gray-300 mb-3">Depending on the circumstances, you have a right to know:</p>
            <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4 mb-4">
              <li>whether we collect and use your personal information;</li>
              <li>the categories of personal information that we collect;</li>
              <li>the purposes for which the collected personal information is used;</li>
              <li>whether we sell your personal information to third parties;</li>
              <li>the categories of personal information that we sold or disclosed for a business purpose;</li>
              <li>the categories of third parties to whom the personal information was sold or disclosed for a business purpose; and</li>
              <li>the business or commercial purpose for collecting or selling personal information.</li>
            </ul>
            <p className="text-gray-300 mb-4">In accordance with applicable law, we are not obligated to provide or delete consumer information that is de-identified in response to a consumer request or to re-identify individual data to verify a consumer request.</p>

            <p className="text-gray-300 mb-4"><strong>Right to Non-Discrimination for the Exercise of a Consumer's Privacy Rights</strong></p>
            <p className="text-gray-300 mb-4">We will not discriminate against you if you exercise your privacy rights.</p>

            <p className="text-gray-300 mb-3"><strong>Verification process</strong></p>
            <p className="text-gray-300 mb-3">Upon receiving your request, we will need to verify your identity to determine you are the same person about whom we have the information in our system. These verification efforts require us to ask you to provide information so that we can match it with information you have previously provided us. For instance, depending on the type of request you submit, we may ask you to provide certain information so that we can match the information you provide with the information we already have on file, or we may contact you through a communication method (e.g., phone or email) that you have previously provided to us. We may also use other verification methods as the circumstances dictate.</p>
            <p className="text-gray-300 mb-4">We will only use personal information provided in your request to verify your identity or authority to make the request. To the extent possible, we will avoid requesting additional information from you for the purposes of verification. However, if we cannot verify your identity from the information already maintained by us, we may request that you provide additional information for the purposes of verifying your identity and for security or fraud-prevention purposes. We will delete such additionally provided information as soon as we finish verifying you.</p>

            <p className="text-gray-300 mb-3"><strong>Other privacy rights</strong></p>
            <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4 mb-4">
              <li>You may object to the processing of your personal information.</li>
              <li>You may request correction of your personal data if it is incorrect or no longer relevant, or ask to restrict the processing of the information.</li>
              <li>You can designate an authorized agent to make a request under the CCPA on your behalf. We may deny a request from an authorized agent that does not submit proof that they have been validly authorized to act on your behalf in accordance with the CCPA.</li>
              <li>You may request to opt out from future selling of your personal information to third parties. Upon receiving an opt-out request, we will act upon the request as soon as feasibly possible, but no later than fifteen (15) days from the date of the request submission.</li>
            </ul>
            <p className="text-gray-300">To exercise these rights, you can contact us by visiting <Link to="/contact" className="text-orange-500 hover:text-orange-400">our contact page</Link>, or by referring to the contact details at the bottom of this document. If you have a complaint about how we handle your data, we would like to hear from you.</p>
            <a href="#table-of-contents" className="text-orange-500 hover:text-orange-400 text-sm">↑ Back to Top</a>
          </div>

          {/* 12. Updates */}
          <div id="section-12">
            <h2 className="text-2xl font-bold text-white mb-4">12. DO WE MAKE UPDATES TO THIS NOTICE?</h2>
            <p className="text-gray-300 mb-3"><em>In Short: Yes, we will update this notice as necessary to stay compliant with relevant laws.</em></p>
            <p className="text-gray-300">
              We may update this privacy notice from time to time. The updated version will be indicated by an updated "Revised" date and the updated version will be effective as soon as it is accessible. If we make material changes to this privacy notice, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this privacy notice frequently to be informed of how we are protecting your information.
</p>
            <a href="#table-of-contents" className="text-orange-500 hover:text-orange-400 text-sm">↑ Back to Top</a>
          </div>

          {/* 13. Contact Us */}
          <div id="section-13">
            <h2 className="text-2xl font-bold text-white mb-4">13. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</h2>
            <p className="text-gray-300 mb-3">If you have questions or comments about this notice, you may email us at <span className="text-gray-300">mecacaraudio [at] gmail [dot] com</span> or by post to:</p>
            <p className="text-gray-300">
              MECA Inc.<br />
              235 Flamingo Dr.<br />
              Louisville, KY 40218<br />
              United States
</p>
            <a href="#table-of-contents" className="text-orange-500 hover:text-orange-400 text-sm">↑ Back to Top</a>
          </div>

          {/* 14. Review/Update/Delete */}
          <div id="section-14">
            <h2 className="text-2xl font-bold text-white mb-4">14. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</h2>
            <p className="text-gray-300">
              Based on the applicable laws of your country, you may have the right to request access to the personal information we collect from you, change that information, or delete it in some circumstances. To request to review, update, or delete your personal information, please visit <Link to="/contact" className="text-orange-500 hover:text-orange-400">our contact page</Link>.
</p>
            <a href="#table-of-contents" className="text-orange-500 hover:text-orange-400 text-sm">↑ Back to Top</a>
          </div>
        </div>
      </div>
    </div>
  );
}

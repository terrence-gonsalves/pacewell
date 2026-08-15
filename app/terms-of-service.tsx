import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';

const sections = [
    {
        title: '1. Agreement to These Terms',
        content: [
            'These Terms of Service ("Terms") form an agreement between you and Pacewell Ltd ("Pacewell", "we", "us", or "our") governing your access to and use of the Pacewell mobile application, website, and related services (collectively, the "Service").',
            'By creating a Pacewell account or using the Service, you agree to these Terms and acknowledge our Privacy Policy.',
            'You must be at least 18 years old to create an account or use Pacewell.',
            'If you do not agree to these Terms, do not create an account or use the Service.',
        ],
    },
    {
        title: '2. About Pacewell',
        content: [
            'Pacewell is a health, wellness, activity, and recovery-tracking application intended to help adults better understand patterns in their own wellness data.',
            'Depending on the features you choose to use, Pacewell may allow you to:',
        ],
        bullets: [
            'complete daily wellness check-ins;',
            'record physical activities;',
            'import supported health and fitness information through Google Health Connect;',
            'view health and activity trends;',
            'track information such as steps, heart rate, body weight, sleep, mood, energy, stress, and recovery-related information where available;',
            'receive AI-generated wellness insights based on your Pacewell data; and',
            'enable optional reminders and notifications.',
        ],
        contentAfter: [
            'Features may change, be added, or be removed as Pacewell develops.',
        ],
    },
    {
        title: '3. General Wellness Service — Not Medical Care',
        content: [
            'Pacewell is a general wellness application. It is not a medical device and does not provide medical advice, diagnosis, treatment, or emergency medical services.',
            'Information provided through Pacewell, including AI-generated insights, trends, observations, reminders, health metrics, and recommendations, is provided for general wellness and informational purposes only.',
            'Pacewell does not have access to your complete medical history and should not be relied upon to assess or manage a medical condition.',
            'Always seek appropriate advice from a qualified healthcare professional regarding medical concerns or before making significant changes to your health, medication, diet, exercise, or treatment.',
            'Do not disregard professional medical advice or delay seeking medical care because of information displayed by Pacewell.',
            'If you believe you are experiencing a medical emergency, contact the appropriate emergency service immediately.',
        ],
    },
    {
        title: '4. Your Account',
        content: [
            'You must create an account to use certain Pacewell features.',
            'You agree to:',
        ],
        bullets: [
            'provide accurate information when creating and maintaining your account;',
            'maintain control of the email account associated with Pacewell;',
            'take reasonable steps to prevent unauthorized access to your account;',
            'notify us if you reasonably believe your account has been compromised; and',
            'use your account only for yourself unless Pacewell expressly provides otherwise.',
        ],
        contentAfter: [
            'You are responsible for activity performed through your account to the extent reasonably within your control.',
            'We may take reasonable steps to secure, restrict, or suspend an account where we believe unauthorized access, misuse, fraud, or another security risk may exist.',
        ],
    },
    {
        title: '5. Your Health and Wellness Information',
        content: [
            'You retain your rights in the personal, health, activity, and wellness information you provide to Pacewell.',
            'You give Pacewell permission to process that information only as reasonably necessary to:',
        ],
        bullets: [
            'provide the Service;',
            'display and analyze your information;',
            'generate features and insights you request;',
            'maintain and secure your account;',
            'operate integrations you choose to enable; and',
            'perform the other activities described in our Privacy Policy.',
        ],
        contentAfter: [
            'This permission does not transfer ownership of your personal or health information to Pacewell.',
            'Pacewell\'s collection, use, disclosure, retention, and deletion of personal information are further described in the Privacy Policy.',
        ],
    },
    {
        title: '6. Information You Enter',
        content: [
            'You are responsible for information you choose to enter into Pacewell.',
            'This includes information contained in:',
        ],
        bullets: [
            'profile fields;',
            'daily check-ins;',
            'activity records;',
            'health goals; and',
            'free-form notes.',
        ],
        contentAfter: [
            'You should not enter another person\'s personal information without appropriate authorization.',
            'Pacewell may produce incomplete or less useful results when information you provide is inaccurate, incomplete, or inconsistent.',
        ],
    },
    {
        title: '7. Google Health Connect',
        content: [
            'Pacewell may allow supported Android users to connect Google Health Connect.',
            'Connecting Health Connect is optional.',
            'You control whether Pacewell receives Health Connect permissions and may change or revoke those permissions through Android or Health Connect settings.',
            'Pacewell may only access supported Health Connect information for which you grant permission and which is required for Pacewell\'s user-facing wellness, activity, recovery, and insight functionality.',
            'The availability, operation, accuracy, or compatibility of Health Connect is controlled in part by Google and your device environment. Pacewell cannot guarantee that third-party health information will always be available, complete, accurate, or synchronized without interruption.',
        ],
    },
    {
        title: '8. AI-Generated Insights',
        content: [
            'Pacewell uses artificial intelligence to generate personalized wellness insights based on information available in your Pacewell account.',
            'You acknowledge that:',
        ],
        bullets: [
            'AI-generated content may contain errors;',
            'AI systems may misunderstand, overlook, or incorrectly interpret patterns;',
            'an insight may be incomplete or inappropriate for your individual circumstances;',
            'Pacewell does not have your complete medical history;',
            'AI-generated insights are not medical advice;',
            'an AI-generated relationship between two data points does not necessarily establish that one caused the other; and',
            'you remain responsible for deciding whether and how to act upon general wellness information presented by Pacewell.',
        ],
        contentAfter: [
            'Pacewell attempts to design its AI features to provide cautious, evidence-based general wellness information, but we do not guarantee that every insight will be accurate, complete, appropriate, or useful.',
            'Information submitted for AI processing is handled as described in our Privacy Policy.',
        ],
    },
    {
        title: '9. Acceptable Use',
        content: [
            'You agree not to misuse Pacewell.',
            'You must not:',
        ],
        bullets: [
            'use the Service for unlawful or fraudulent purposes;',
            'attempt to gain unauthorized access to another user\'s account or data;',
            'attempt to bypass security, authentication, usage, or access controls;',
            'intentionally interfere with the operation or security of the Service;',
            'introduce malware or other harmful code;',
            'use automated systems to scrape, extract, or systematically access Pacewell without our written authorization;',
            'impersonate another person or misrepresent your identity;',
            'use Pacewell to violate another person\'s privacy or intellectual-property rights;',
            'reverse engineer or attempt to derive Pacewell source code except where such restriction is prohibited by applicable law; or',
            'use the Service in a manner that could reasonably harm Pacewell, its infrastructure, its service providers, or other users.',
        ],
        contentAfter: [
            'We may restrict or suspend access where reasonably necessary to investigate or prevent misuse, security threats, unlawful conduct, or material violations of these Terms.',
        ],
    },
    {
        title: '10. Third-Party Services',
        content: [
            'Pacewell relies on or integrates with third-party services, which may include:',
        ],
        subsections: [
            {
                title: 'Supabase',
                text: 'Used for authentication, database, storage, and backend infrastructure.',
            },
            {
                title: 'Anthropic',
                text: 'Used for AI processing.',
            },
            {
                title: 'Google Health Connect',
                text: 'Used for optional Android health and fitness integration.',
            },
            {
                title: 'Expo / EAS',
                text: 'Used for mobile application build and delivery infrastructure.',
            },
        ],
        contentAfter: [
            'Third-party services are governed by their own agreements, policies, technical limitations, and availability.',
            'We do not control third-party services and cannot guarantee that they will remain available, unchanged, compatible, or error-free.',
            'Where a third-party outage or change affects Pacewell, some Service functionality may temporarily become unavailable.',
        ],
    },
    {
        title: '11. Privacy',
        content: [
            'Your use of Pacewell is also governed by our Privacy Policy.',
            'The Privacy Policy explains, among other matters:',
        ],
        bullets: [
            'what personal information Pacewell collects;',
            'how information is used;',
            'how Health Connect information is handled;',
            'how AI processing works;',
            'which service providers process information;',
            'how information is protected;',
            'how long information may be retained;',
            'how to manage permissions; and',
            'how to delete your Pacewell account and associated information.',
        ],
    },
    {
        title: '12. Account Deletion',
        content: [
            'You may delete your Pacewell account through the App.',
            'When a valid deletion request completes successfully, Pacewell will remove the active account and associated Pacewell application information as described in our Privacy Policy.',
            'Certain limited information may remain temporarily in backups, service-provider systems, security logs, or legal records where retention is reasonably necessary or legally required.',
            'Deleting Pacewell does not necessarily delete information independently maintained by another service, including information stored within Health Connect or another application.',
        ],
    },
    {
        title: '13. Intellectual Property',
        content: [
            'Except for information owned by users or third parties, the Pacewell Service and its associated software, design, branding, visual elements, text, graphics, logos, features, and other materials are owned by or licensed to Pacewell Ltd and may be protected by copyright, trademark, and other applicable intellectual-property laws.',
            'Subject to these Terms, Pacewell grants you a limited, personal, revocable, non-exclusive, non-transferable licence to use the Pacewell application for your own lawful personal use.',
            'This licence does not give you ownership of Pacewell or permission to reproduce, distribute, commercially exploit, sublicense, or create derivative products from the Service except where expressly permitted by Pacewell or applicable law.',
        ],
    },
    {
        title: '14. Availability and Changes to the Service',
        content: [
            'We aim to make Pacewell available reliably, but we do not guarantee uninterrupted or error-free operation.',
            'The Service may occasionally be unavailable because of:',
        ],
        bullets: [
            'maintenance;',
            'software updates;',
            'security work;',
            'internet or network failures;',
            'service-provider outages;',
            'operating-system changes;',
            'Health Connect availability;',
            'technical failures; or',
            'circumstances outside our reasonable control.',
        ],
        contentAfter: [
            'We may improve, modify, replace, discontinue, or introduce features as Pacewell develops.',
            'Where a material change significantly affects existing users, we will make reasonable efforts to provide appropriate notice.',
        ],
    },
    {
        title: '15. Fees and Future Paid Features',
        content: [
            'Unless clearly stated otherwise within the Service, access to currently available Pacewell functionality is provided under the pricing and access conditions shown to you at the time you use it.',
            'Pacewell may introduce subscriptions, paid features, or other commercial offerings in the future.',
            'Before charging you for a new paid service, Pacewell will provide the applicable price and material payment terms and obtain any authorization required by law or the relevant app-store platform.',
            'Introducing a paid feature does not authorize Pacewell to charge you without your agreement.',
        ],
    },
    {
        title: '16. No Warranty',
        content: [
            'To the extent permitted by applicable law, Pacewell is provided on an "as is" and "as available" basis.',
            'We do not guarantee that:',
        ],
        bullets: [
            'Pacewell will always be available;',
            'all data will always synchronize correctly;',
            'all health information obtained from third parties will be accurate;',
            'AI-generated insights will always be correct;',
            'the Service will meet every user\'s individual needs; or',
            'every defect or interruption can be prevented.',
        ],
        contentAfter: [
            'Nothing in these Terms excludes warranties, guarantees, or other rights that cannot lawfully be excluded under applicable consumer-protection legislation.',
        ],
    },
    {
        title: '17. Limitation of Liability',
        content: [
            'To the maximum extent permitted by applicable law, Pacewell Ltd and its directors, officers, employees, contractors, and agents will not be responsible for indirect, incidental, special, exemplary, punitive, or consequential losses resulting from your use of or inability to use the Service.',
            'Pacewell is not responsible for decisions made solely on the basis of AI-generated or general wellness information where Pacewell has clearly identified that information as non-medical and informational.',
            'Nothing in these Terms excludes or limits liability where exclusion or limitation is prohibited by applicable law.',
            'Nothing in these Terms limits any mandatory rights or remedies available to you under applicable consumer-protection legislation.',
        ],
    },
    {
        title: '18. Indemnification',
        content: [
            'To the extent permitted by applicable law, you agree to be responsible for reasonable losses, claims, or costs incurred by Pacewell arising directly from your intentional unlawful use of the Service, material violation of these Terms, or infringement of another person\'s rights.',
            'This section does not require you to indemnify Pacewell for losses caused by Pacewell\'s own unlawful conduct, negligence where liability cannot lawfully be excluded, or matters for which indemnification is prohibited by law.',
        ],
    },
    {
        title: '19. Suspension and Termination',
        content: [
            'You may stop using Pacewell at any time and may delete your account through the App.',
            'We may suspend or terminate access where reasonably necessary because of:',
        ],
        bullets: [
            'a material violation of these Terms;',
            'fraud or unlawful activity;',
            'a significant security threat;',
            'abuse of another person or the Service;',
            'legal or regulatory requirements; or',
            'circumstances making continued operation of the account unsafe or impracticable.',
        ],
        contentAfter: [
            'Where appropriate and reasonably possible, we may provide notice before termination.',
            'Sections that by their nature are intended to survive termination, including provisions relating to intellectual property, disclaimers, liability, and applicable law, will continue to apply.',
        ],
    },
    {
        title: '20. Changes to These Terms',
        content: [
            'We may update these Terms as Pacewell, applicable laws, service providers, or business practices change.',
            'When changes are material, we may notify you through the App, by email, or another appropriate method.',
            'The date displayed at the top identifies the latest version.',
            'Where applicable law requires additional notice, consent, or another process before revised terms become binding, we will follow those requirements.',
            'Continued use of Pacewell after updated Terms become effective may constitute acceptance of those Terms where permitted by applicable law.',
        ],
    },
    {
        title: '21. Governing Law',
        content: [
            'These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable in Ontario, without regard to conflict-of-law principles.',
            'However, if mandatory consumer-protection or other laws applicable in your province, territory, or jurisdiction give you rights that cannot lawfully be waived, those rights continue to apply.',
            'Before commencing formal proceedings, you and Pacewell are encouraged to attempt to resolve disputes through reasonable good-faith communication where appropriate.',
            'Nothing in these Terms prevents either party from exercising rights or remedies available under applicable law.',
        ],
    },
    {
        title: '22. Severability',
        content: [
            'If a court or other competent authority determines that any part of these Terms is invalid or unenforceable, that provision will be interpreted or limited to the minimum extent necessary, and the remaining provisions will continue to apply to the extent permitted by law.',
        ],
    },
    {
        title: '23. Entire Agreement',
        content: [
            'These Terms, together with the Privacy Policy and any additional terms expressly presented for a particular Pacewell feature or paid service, constitute the agreement between you and Pacewell regarding your use of the Service.',
        ],
    },
    {
        title: '24. Contact Us',
        content: [
            'Questions about these Terms may be directed to:',
        ],
        contact: [
            'Pacewell Ltd',
            'Email: legal@getpacewell.com',
            'Website: getpacewell.com',
        ],
    },
];

type Subsection = {
    title: string;
    text: string;
};

type Section = {
    title: string;
    content?: string[];
    bullets?: string[];
    contentAfter?: string[];
    contact?: string[];
    subsections?: Subsection[];
};

function BulletList({ items }: { items: string[] }) {
    return (
        <View style={styles.bulletList}>
            {items.map((item, index) => (
                <View key={`${item}-${index}`} style={styles.bulletRow}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                </View>
            ))}
        </View>
    );
}

function Paragraphs({ items }: { items: string[] }) {
    return (
        <>
            {items.map((item, index) => (
                <Text key={`${item}-${index}`} style={styles.bodyText}>
                    {item}
                </Text>
            ))}
        </>
    );
}

export default function TermsOfServiceScreen() {
    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <Ionicons name="arrow-back" size={26} color={theme.colors.textDark} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Terms of Service</Text>

                <View style={styles.headerSpacer} />
            </View>

            <View style={styles.headerDivider} />

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.introCard}>
                    <Text style={styles.introText}>
                        Please read these Terms of Service carefully before using Pacewell.
                    </Text>

                    <Text style={styles.introText}>
                        By creating an account or using the Pacewell mobile application, website, or related services, you agree to these Terms.
                    </Text>

                    <Text style={[styles.introText, styles.introTextLast]}>
                        If you do not agree to these Terms, do not create an account or use Pacewell.
                    </Text>
                </View>

                <Text style={styles.updatedText}>Last updated: August 14, 2026</Text>

                {sections.map((section: Section) => (
                    <View key={section.title} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>

                        {section.content && <Paragraphs items={section.content} />}

                        {section.bullets && <BulletList items={section.bullets} />}

                        {section.subsections?.map(subsection => (
                            <View key={subsection.title} style={styles.subsection}>
                                <Text style={styles.subsectionTitle}>{subsection.title}</Text>
                                <Text style={styles.bodyText}>{subsection.text}</Text>
                            </View>
                        ))}

                        {section.contact && (
                            <View style={styles.contactBlock}>
                                {section.contact.map((line, index) => (
                                    <Text
                                        key={line}
                                        style={[
                                            styles.contactText,
                                            index === 0 && styles.contactName,
                                        ]}
                                    >
                                        {line}
                                    </Text>
                                ))}
                            </View>
                        )}

                        {section.contentAfter && <Paragraphs items={section.contentAfter} />}
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        backgroundColor: theme.colors.background,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        color: theme.colors.textDark,
        ...theme.typography.screenTitle,
    },
    headerSpacer: {
        width: 44,
    },
    headerDivider: {
        height: 1,
        marginHorizontal: theme.spacing.lg,
        backgroundColor: theme.colors.border,
    },
    content: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
    },
    introCard: {
        backgroundColor: theme.colors.primaryLight,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
    },
    introText: {
        color: theme.colors.textBody,
        fontSize: 15,
        lineHeight: 23,
        marginBottom: 14,
    },
    introTextLast: {
        marginBottom: 0,
    },
    updatedText: {
        color: theme.colors.textSubtle,
        fontSize: 13,
        marginBottom: theme.spacing.xl,
    },
    section: {
        marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
        color: theme.colors.textDark,
        fontSize: 20,
        fontWeight: '700',
        lineHeight: 27,
        paddingBottom: 12,
        marginBottom: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    subsection: {
        marginTop: theme.spacing.sm,
    },
    subsectionTitle: {
        color: theme.colors.textDark,
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 22,
        marginBottom: theme.spacing.sm,
    },
    bodyText: {
        color: theme.colors.textBody,
        fontSize: 15,
        lineHeight: 24,
        marginBottom: theme.spacing.md,
    },
    bulletList: {
        marginBottom: theme.spacing.md,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.sm,
        paddingRight: theme.spacing.sm,
    },
    bullet: {
        width: 20,
        color: theme.colors.primary,
        fontSize: 16,
        lineHeight: 23,
    },
    bulletText: {
        flex: 1,
        color: theme.colors.textBody,
        fontSize: 15,
        lineHeight: 23,
    },
    contactBlock: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    contactText: {
        color: theme.colors.textBody,
        fontSize: 15,
        lineHeight: 23,
    },
    contactName: {
        color: theme.colors.textDark,
        fontWeight: '700',
        marginBottom: theme.spacing.xs,
    },
});
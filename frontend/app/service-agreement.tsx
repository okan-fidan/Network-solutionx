import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ServiceAgreementScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hizmet Sözleşmesi</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Son güncelleme: Ocak 2025</Text>

        <View style={styles.introSection}>
          <Ionicons name="document-text" size={48} color="#6366f1" />
          <Text style={styles.introTitle}>Network Solution Hizmet Sözleşmesi</Text>
          <Text style={styles.introText}>
            Bu sözleşme, Network Solution uygulamasını kullanırken tarafların 
            hak ve yükümlülüklerini belirler.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Taraflar</Text>
          <Text style={styles.sectionText}>
            Bu sözleşme;{"\n\n"}
            <Text style={styles.bold}>Hizmet Sağlayıcı:</Text> Network Solution Platformu{"\n"}
            <Text style={styles.bold}>Kullanıcı:</Text> Uygulamayı kullanan gerçek veya tüzel kişi{"\n\n"}
            arasında akdedilmiştir.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Hizmetin Tanımı</Text>
          <Text style={styles.sectionText}>
            Network Solution, girişimcilerin birbirleriyle iletişim kurması, 
            network oluşturması ve iş birliği yapması için tasarlanmış bir sosyal 
            ağ platformudur.{"\n\n"}
            Platform aşağıdaki hizmetleri sunar:{"\n"}
            • Şehir bazlı girişimci toplulukları{"\n"}
            • Mesajlaşma ve grup sohbetleri{"\n"}
            • Etkinlik organizasyonu{"\n"}
            • Hizmet paylaşımı ve tanıtımı{"\n"}
            • İş fırsatları ve networking
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Kullanıcı Yükümlülükleri</Text>
          <Text style={styles.sectionText}>
            Kullanıcı aşağıdaki yükümlülükleri kabul eder:{"\n\n"}
            • Doğru ve güncel bilgi sağlamak{"\n"}
            • Hesap güvenliğini korumak{"\n"}
            • Yasalara ve topluluk kurallarına uymak{"\n"}
            • Diğer kullanıcılara saygılı davranmak{"\n"}
            • Spam veya zararlı içerik paylaşmamak{"\n"}
            • Ticari amaçlı kötüye kullanım yapmamak{"\n"}
            • Platform güvenliğini tehlikeye atmamak
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Hizmet Sağlayıcının Yükümlülükleri</Text>
          <Text style={styles.sectionText}>
            Hizmet sağlayıcı aşağıdaki yükümlülükleri üstlenir:{"\n\n"}
            • Platformun kesintisiz çalışması için çaba göstermek{"\n"}
            • Kullanıcı verilerini korumak{"\n"}
            • Teknik destek sağlamak{"\n"}
            • Topluluk kurallarını uygulamak{"\n"}
            • Güvenlik açıklarını gidermek
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Fikri Mülkiyet Hakları</Text>
          <Text style={styles.sectionText}>
            • Platform üzerindeki tüm içerik, tasarım ve yazılım Network Solution'a aittir.{"\n"}
            • Kullanıcılar, paylaştıkları içerikler üzerindeki haklarını korur.{"\n"}
            • Kullanıcılar, içeriklerinin platformda kullanılmasına izin verir.{"\n"}
            • Üçüncü taraf içerikleri ilgili sahiplerine aittir.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Ücretlendirme</Text>
          <Text style={styles.sectionText}>
            • Temel platform kullanımı ücretsizdir.{"\n"}
            • Premium özellikler için ücret talep edilebilir.{"\n"}
            • Ücretli hizmetlerin fiyatları uygulama içinde belirtilir.{"\n"}
            • Ödemeler güvenli ödeme sistemleri üzerinden gerçekleştirilir.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Sorumluluk Sınırlaması</Text>
          <Text style={styles.sectionText}>
            • Platform "olduğu gibi" sunulmaktadır.{"\n"}
            • Kesintisiz veya hatasız çalışma garanti edilmez.{"\n"}
            • Kullanıcılar arası anlaşmazlıklarda platform sorumlu değildir.{"\n"}
            • Dolaylı zararlar için sorumluluk kabul edilmez.{"\n"}
            • Üçüncü taraf hizmetlerinden doğan sorunlardan platform sorumlu değildir.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Hesap Askıya Alma ve Sonlandırma</Text>
          <Text style={styles.sectionText}>
            Aşağıdaki durumlarda hesap askıya alınabilir veya sonlandırılabilir:{"\n\n"}
            • Kullanım koşullarının ihlali{"\n"}
            • Yasadışı faaliyetler{"\n"}
            • Diğer kullanıcıları taciz etme{"\n"}
            • Platform güvenliğini tehlikeye atma{"\n"}
            • Sahte veya yanıltıcı bilgi paylaşma
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Uyuşmazlık Çözümü</Text>
          <Text style={styles.sectionText}>
            • Bu sözleşme Türkiye Cumhuriyeti yasalarına tabidir.{"\n"}
            • Uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.{"\n"}
            • Taraflar öncelikle dostane çözüm yollarını denemeyi kabul eder.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Sözleşme Değişiklikleri</Text>
          <Text style={styles.sectionText}>
            • Bu sözleşme zaman zaman güncellenebilir.{"\n"}
            • Önemli değişiklikler kullanıcılara bildirilir.{"\n"}
            • Değişikliklerden sonra platformu kullanmaya devam etmek, 
              yeni koşulların kabulü anlamına gelir.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. İletişim</Text>
          <Text style={styles.sectionText}>
            Sözleşme ile ilgili sorularınız için:{"\n\n"}
            <Text style={styles.bold}>E-posta:</Text> sozlesme@networksolution.com{"\n"}
            <Text style={styles.bold}>Adres:</Text> İstanbul, Türkiye{"\n"}
            <Text style={styles.bold}>Web:</Text> www.networksolution.com
          </Text>
        </View>

        <View style={styles.acceptSection}>
          <Ionicons name="checkmark-circle" size={32} color="#10b981" />
          <Text style={styles.acceptText}>
            Bu uygulamayı kullanarak yukarıdaki tüm koşulları okuduğunuzu 
            ve kabul ettiğinizi beyan etmiş olursunuz.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 Network Solution</Text>
          <Text style={styles.footerText}>Tüm hakları saklıdır.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0a0a0a' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1f2937' 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center' 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#fff' 
  },
  content: { 
    flex: 1, 
    padding: 16 
  },
  lastUpdated: { 
    color: '#6b7280', 
    fontSize: 13, 
    marginBottom: 24 
  },
  introSection: {
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  introText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: { 
    marginBottom: 24,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#fff', 
    marginBottom: 12 
  },
  sectionText: { 
    fontSize: 14, 
    color: '#9ca3af', 
    lineHeight: 22 
  },
  bold: {
    fontWeight: '600',
    color: '#d1d5db',
  },
  acceptSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b98115',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  acceptText: {
    flex: 1,
    fontSize: 13,
    color: '#10b981',
    lineHeight: 20,
  },
  footer: { 
    alignItems: 'center', 
    paddingVertical: 32 
  },
  footerText: { 
    color: '#6b7280', 
    fontSize: 13,
    marginBottom: 4,
  },
});

# views.py

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.core.exceptions import ValidationError
from django.conf import settings
from django.core.mail import send_mail

from django.contrib.auth import get_user_model

from rest_framework import (
    viewsets,
    status,
    filters,
    generics
)

from rest_framework.response import Response

from rest_framework.permissions import (
    IsAuthenticated,
    AllowAny,
    IsAdminUser
)

from rest_framework.decorators import (
    action,
    api_view,
    permission_classes,
    parser_classes
)

from rest_framework.parsers import (
    JSONParser,
    MultiPartParser,
    FormParser
)
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    Student,
    Subject,
    Section,
    Enrollment
)

from .serializers import (
    StudentSerializer,
    StudentRegistrationSerializer,
    SubjectSerializer,
    SectionSerializer,
    EnrollmentSerializer,
    first_model_error,
    RegisterSerializer,
    ActivationVerifySerializer,
    ActivationResendSerializer,
    ActiveTokenObtainPairSerializer
)

from .permissions import IsAdminOrReadOnly

User = get_user_model()


def send_activation_email(user):
    if not user.activation_code:
        user.generate_activation_code()
        user.save(update_fields=[
            'activation_code',
            'activation_code_expires_at',
        ])

    subject = 'Student Enrollment Account Verification'
    message = (
        f'Hello,\n\n'
        f'Your Student Enrollment System verification code is: {user.activation_code}\n\n'
        f'This code expires in 15 minutes. If you did not create this account, '
        f'please ignore this email.\n'
    )

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


def build_chatbot_response(user, message):
    text = " ".join(str(message or "").strip().lower().split())

    if not text:
        return "Please type a question so I can help."

    try:
        student = Student.objects.get(user=user)
    except Student.DoesNotExist:
        student = None

    if any(word in text for word in ["hello", "hi", "hey"]):
        name = student.first_name if student else "there"
        return f"Hi {name}. I can help with enrollment, subjects, sections, profile, and account questions."

    if any(word in text for word in ["subject", "subjects", "course list", "available"]):
        if student and not user.is_staff:
            subjects = Subject.objects.filter(
                Q(course=student.course) | Q(course='GENERAL'),
                year_level=student.year_level,
                semester=student.semester
            ).order_by('subject_code')[:8]
        else:
            subjects = Subject.objects.order_by('subject_code')[:8]

        if not subjects:
            return "No available subjects were found for your current curriculum."

        subject_list = ", ".join(
            f"{subject.subject_code} - {subject.subject_name}"
            for subject in subjects
        )

        return f"Available subjects include: {subject_list}."

    if any(word in text for word in ["enrollment", "enrolled", "status", "waitlist", "waitlisted"]):
        if not student and not user.is_staff:
            return "I could not find your student profile, so I cannot check enrollment records yet."

        enrollments = Enrollment.objects.select_related(
            'subject',
            'section',
            'student'
        )

        if not user.is_staff:
            enrollments = enrollments.filter(student=student)

        enrollments = enrollments.order_by('-created_at')[:8]

        if not enrollments:
            return "You do not have enrollment records yet. Go to Enrollments and choose a subject to enroll."

        enrollment_list = "; ".join(
            f"{enrollment.subject.subject_code} ({enrollment.status})"
            for enrollment in enrollments
        )

        return f"Here are the latest enrollment records: {enrollment_list}."

    if any(word in text for word in ["section", "slot", "capacity", "room", "schedule"]):
        sections = Section.objects.select_related('subject').order_by(
            'subject__subject_code',
            'section_name'
        )

        if student and not user.is_staff:
            sections = sections.filter(
                Q(subject__course=student.course) | Q(subject__course='GENERAL'),
                subject__year_level=student.year_level,
                subject__semester=student.semester
            )

        sections = sections[:8]

        if not sections:
            return "No sections are currently available for your curriculum."

        section_list = "; ".join(
            f"{section.subject.subject_code} section {section.section_name}: {section.available_slots} slot(s)"
            for section in sections
        )

        return f"Section availability: {section_list}."

    if any(word in text for word in ["profile", "student number", "student no", "my info"]):
        if not student:
            return "I could not find your student profile."

        return (
            f"Your profile is {student.full_name}, student number "
            f"{student.student_number or 'N/A'}, {student.course or 'No course'}, "
            f"{student.year_level or 'No year level'}, {student.semester or 'No semester'}."
        )

    if any(word in text for word in ["register", "sign up", "account"]):
        return (
            "To create an account, open Register, complete the required student details, "
            "choose course, year level, and semester, then submit with a strong password."
        )

    if any(word in text for word in ["help", "what can you do", "commands"]):
        return (
            "You can ask me about available subjects, enrollment status, sections and slots, "
            "your profile, registration, or how to enroll."
        )

    if any(word in text for word in ["how to enroll", "enroll", "add subject"]):
        return (
            "To enroll, open the Enrollments tab, select a subject, optionally select a section, "
            "then tap Add Enrollment. The system checks course, year, semester, units, and slots."
        )

    return (
        "I can help with enrollment questions. Try asking: available subjects, my enrollment status, "
        "section slots, my profile, or how to enroll."
    )


def auto_enroll_student(student):
    subjects = Subject.objects.filter(
        Q(course=student.course) | Q(course='GENERAL'),
        year_level=student.year_level,
        semester=student.semester
    )

    enrollments_created = 0
    waitlisted_count = 0

    for subject in subjects:
        enrollment, created = Enrollment.objects.get_or_create(
            student=student,
            subject=subject,
            semester=subject.semester,
            defaults={'status': 'ENROLLED'}
        )

        if not created:
            continue

        enrollments_created += 1

        if enrollment.status == 'WAITLISTED':
            waitlisted_count += 1

    return enrollments_created, waitlisted_count


def auto_enroll_subject(subject):
    Section.objects.get_or_create(
        subject=subject,
        section_name='A',
        defaults={
            'max_capacity': 40,
            'current_count': 0,
            'room': '',
            'schedule': '',
        }
    )

    students = Student.objects.filter(
        course=subject.course if subject.course != 'GENERAL' else None
    ) if subject.course != 'GENERAL' else Student.objects.all()

    students = students.filter(
        year_level=subject.year_level,
        semester=subject.semester
    )

    enrollments_created = 0

    for student in students:
        _, created = Enrollment.objects.get_or_create(
            student=student,
            subject=subject,
            semester=subject.semester,
            defaults={'status': 'ENROLLED'}
        )

        if created:
            enrollments_created += 1

    return enrollments_created


# =========================================================
# REGISTER USER
# =========================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):

    serializer = StudentRegistrationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        with transaction.atomic():

            student = serializer.save()

            enrollments_created, waitlisted_count = auto_enroll_student(
                student
            )

            send_activation_email(student.user)

            return Response({
                "message": "Registration successful. Please check your email for the verification code.",
                "student_id": student.id,
                "email": student.email,
                "is_active": student.user.is_active,
                "auto_enrolled_count": enrollments_created,
                "waitlisted_count": waitlisted_count
            })

    except ValidationError as e:
        return Response({
            "error": first_model_error(e)
        }, status=status.HTTP_400_BAD_REQUEST)
    except IntegrityError:
        return Response({
            "error": "Duplicate student name, student number, or email address is not allowed."
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            "error": str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


# =========================================================
# ACCOUNT ACTIVATION
# =========================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_activation_code(request):
    serializer = ActivationVerifySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    email = serializer.validated_data['email']
    code = serializer.validated_data['code']

    try:
        user = User.objects.select_related('student_profile').get(email__iexact=email)
    except User.DoesNotExist:
        return Response(
            {"error": "Account not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if user.is_active:
        return Response({
            "message": "Account is already active.",
            "is_active": True,
        })

    if not user.activation_code_is_valid(code):
        return Response(
            {"error": "Invalid or expired verification code."},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.is_active = True
    user.clear_activation_code()
    user.save(update_fields=[
        'is_active',
        'activation_code',
        'activation_code_expires_at',
    ])

    if hasattr(user, 'student_profile'):
        user.student_profile.is_active = True
        user.student_profile.save(update_fields=['is_active'])

    return Response({
        "message": "Account verified successfully. You can now log in.",
        "is_active": True,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_activation_code(request):
    serializer = ActivationResendSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    email = serializer.validated_data['email']

    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response(
            {"error": "Account not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    if user.is_active:
        return Response({
            "message": "Account is already active.",
            "is_active": True,
        })

    user.generate_activation_code()
    user.save(update_fields=[
        'activation_code',
        'activation_code_expires_at',
    ])
    send_activation_email(user)

    return Response({
        "message": "A new verification code has been sent to your email.",
        "is_active": False,
    })


class ActiveTokenObtainPairView(TokenObtainPairView):
    serializer_class = ActiveTokenObtainPairSerializer


# =========================================================
# STUDENTS
# =========================================================
class StudentViewSet(viewsets.ModelViewSet):

    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAdminUser]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    search_fields = [
        'first_name',
        'last_name',
        'email',
        'student_number'
    ]

    ordering_fields = [
        'first_name',
        'last_name',
        'created_at'
    ]

    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_serializer_context(self):
        return {'request': self.request}

    def get_queryset(self):

        queryset = Student.objects.select_related('user').filter(
            Q(user__isnull=True) | Q(user__is_staff=False)
        ).exclude(
            first_name='',
            last_name=''
        )

        course = self.request.query_params.get('course')
        year_level = self.request.query_params.get('year_level')
        semester = self.request.query_params.get('semester')

        if course:
            queryset = queryset.filter(course=course)

        if year_level:
            queryset = queryset.filter(year_level=year_level)

        if semester:
            queryset = queryset.filter(semester=semester)

        return queryset

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def activate(self, request, pk=None):
        student = self.get_object()
        student.is_active = True
        student.save(update_fields=['is_active'])

        if student.user:
            student.user.is_active = True
            student.user.save(update_fields=['is_active'])

        return Response(StudentSerializer(student, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def deactivate(self, request, pk=None):
        student = self.get_object()
        student.is_active = False
        student.save(update_fields=['is_active'])

        if student.user:
            student.user.is_active = False
            student.user.save(update_fields=['is_active'])

        return Response(StudentSerializer(student, context={'request': request}).data)


# =========================================================
# SUBJECTS
# =========================================================
class SubjectViewSet(viewsets.ModelViewSet):

    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):

        queryset = Subject.objects.all()
        user = self.request.user

        course = self.request.query_params.get('course')
        year_level = self.request.query_params.get('year_level')
        semester = self.request.query_params.get('semester')

        if not user.is_staff:
            try:
                student = Student.objects.get(user=user)
            except Student.DoesNotExist:
                return Subject.objects.none()

            queryset = queryset.filter(
                Q(course=student.course) | Q(course='GENERAL'),
                year_level=student.year_level,
                semester=student.semester
            )

        if course:
            queryset = queryset.filter(
                Q(course=course) | Q(course='GENERAL')
            )

        if year_level:
            queryset = queryset.filter(year_level=year_level)

        if semester:
            queryset = queryset.filter(semester=semester)

        return queryset

    def perform_create(self, serializer):

        subject = serializer.save()

        auto_enroll_subject(subject)

    def perform_update(self, serializer):

        subject = serializer.save()

        auto_enroll_subject(subject)


# =========================================================
# SECTIONS
# =========================================================
class SectionViewSet(viewsets.ModelViewSet):

    queryset = Section.objects.select_related('subject').all()
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]

    def get_queryset(self):

        queryset = Section.objects.select_related('subject').all()
        user = self.request.user
        subject = self.request.query_params.get('subject')

        if not user.is_staff:
            try:
                student = Student.objects.get(user=user)
            except Student.DoesNotExist:
                return Section.objects.none()

            queryset = queryset.filter(
                Q(subject__course=student.course)
                | Q(subject__course='GENERAL'),
                subject__year_level=student.year_level,
                subject__semester=student.semester
            )

        if subject:
            queryset = queryset.filter(subject_id=subject)

        return queryset


# =========================================================
# ENROLLMENTS
# =========================================================
class EnrollmentViewSet(viewsets.ModelViewSet):

    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):

        if self.action in ['list', 'retrieve', 'create']:
            return [IsAuthenticated()]

        return [IsAdminUser()]

    def get_queryset(self):

        user = self.request.user

        queryset = Enrollment.objects.select_related(
            'student',
            'subject',
            'section'
        )

        status_param = self.request.query_params.get('status')
        course = self.request.query_params.get('course')
        year_level = self.request.query_params.get('year_level')
        semester = self.request.query_params.get('semester')

        if not user.is_staff:
            queryset = queryset.filter(student__user=user)

        if status_param:
            queryset = queryset.filter(status=status_param)

        if course:
            queryset = queryset.filter(student__course=course)

        if year_level:
            queryset = queryset.filter(student__year_level=year_level)

        if semester:
            queryset = queryset.filter(semester=semester)

        return queryset

    def create(self, request, *args, **kwargs):

        subject_id = request.data.get('subject')

        if not subject_id:
            return Response(
                {"error": "Subject is required."},
                status=400
            )

        try:
            student = Student.objects.get(user=request.user)
            subject = Subject.objects.get(pk=subject_id)

        except Student.DoesNotExist:
            return Response(
                {"error": "Student profile not found."},
                status=404
            )

        except Subject.DoesNotExist:
            return Response(
                {"error": "Subject not found."},
                status=404
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            enrollment = serializer.save(
                student=student,
                semester=subject.semester,
                status='PENDING'
            )

            return Response(
                EnrollmentSerializer(enrollment).data,
                status=201
            )

        except ValidationError as e:
            return Response(
                {"error": first_model_error(e)},
                status=400
            )

    def _update_enrollment_status(self, request, method_name):
        enrollment = self.get_object()
        remarks = request.data.get('remarks', '')
        section_id = request.data.get('section')
        section = None

        if section_id:
            try:
                section = Section.objects.get(pk=section_id)
            except Section.DoesNotExist:
                return Response(
                    {"error": "Section not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

        try:
            if method_name in ['approve', 're_enroll']:
                getattr(enrollment, method_name)(section=section, remarks=remarks)
            else:
                getattr(enrollment, method_name)(remarks=remarks)

            serializer = self.get_serializer(enrollment)
            return Response(serializer.data)

        except ValidationError as e:
            return Response(
                {"error": first_model_error(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        return self._update_enrollment_status(request, 'approve')

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        return self._update_enrollment_status(request, 'reject')

    @action(detail=True, methods=['post'])
    def drop(self, request, pk=None):
        return self._update_enrollment_status(request, 'drop')

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_enrollment(self, request, pk=None):
        return self._update_enrollment_status(request, 'cancel')

    @action(detail=True, methods=['post'], url_path='re-enroll')
    def re_enroll(self, request, pk=None):
        return self._update_enrollment_status(request, 're_enroll')


# =========================================================
# PROFILE
# =========================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    user = request.user

    return Response({
        "id": user.id,
        "email": user.email,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "is_active": user.is_active,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile(request):

    try:
        student = Student.objects.select_related(
            'user'
        ).get(user=request.user)

        serializer = StudentSerializer(
            student,
            context={'request': request}
        )

        return Response(serializer.data)

    except Student.DoesNotExist:
        return Response(
            {"error": "Student profile not found."},
            status=404
        )


# =========================================================
# UPDATE PROFILE
# =========================================================
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_student_profile(request):

    try:
        student = Student.objects.get(user=request.user)

        serializer = StudentSerializer(
            student,
            data=request.data,
            partial=True,
            context={'request': request}
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    except Student.DoesNotExist:
        return Response(
            {"error": "Student not found."},
            status=404
        )


# =========================================================
# PROFILE PICTURE
# =========================================================
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_profile_picture(request):

    try:
        student = Student.objects.get(user=request.user)

        image = request.FILES.get('profile_picture')

        if not image:
            return Response(
                {"error": "No image uploaded."},
                status=400
            )

        allowed_types = {
            'image/jpeg',
            'image/png',
            'image/webp',
        }

        if image.content_type not in allowed_types:
            return Response(
                {"error": "Only JPG, PNG, or WEBP images are allowed."},
                status=400
            )

        max_size = 2 * 1024 * 1024

        if image.size > max_size:
            return Response(
                {"error": "Profile picture must be 2MB or smaller."},
                status=400
            )

        student.profile_picture = image
        student.save()

        return Response({
            "message": "Profile picture updated successfully",
            "profile_picture": request.build_absolute_uri(
                student.profile_picture.url
            )
        })

    except Student.DoesNotExist:
        return Response(
            {"error": "Student not found."},
            status=404
        )


# =========================================================
# REGISTER CLASS BASED VIEW
# =========================================================
class RegisterView(generics.CreateAPIView):

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


# =========================================================
# CHATBOT
# =========================================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chatbot(request):

    message = request.data.get('message', '')

    if not isinstance(message, str):
        return Response(
            {"message": ["Message must be text."]},
            status=status.HTTP_400_BAD_REQUEST
        )

    message = message.strip()

    if not message:
        return Response(
            {"message": ["Message is required."]},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(message) > 500:
        return Response(
            {"message": ["Message must be 500 characters or fewer."]},
            status=status.HTTP_400_BAD_REQUEST
        )

    return Response({
        "reply": build_chatbot_response(request.user, message)
    })

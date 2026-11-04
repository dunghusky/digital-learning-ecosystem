from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

from .models import Role, User


class UserSerializer(serializers.ModelSerializer):
    """The signed-in user's own profile."""

    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "display_name",
            "first_name",
            "last_name",
            "email",
            "phone",
            "role",
            "school_name",
            "class_name",
            "date_joined",
        ]
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    """Student self sign-up. School and class are required here (not in the database) so
    staff accounts created in the admin can leave them blank."""

    password = serializers.CharField(write_only=True, trim_whitespace=False)
    school_name = serializers.CharField(max_length=255)
    class_name = serializers.CharField(max_length=32)

    class Meta:
        model = User
        fields = [
            "username",
            "password",
            "first_name",
            "last_name",
            "email",
            "phone",
            "school_name",
            "class_name",
        ]
        extra_kwargs = {
            "email": {"required": False},
            "phone": {"required": False},
            "first_name": {"required": False},
            "last_name": {"required": False},
        }

    def validate_username(self, value: str) -> str:
        # The default unique check is case-sensitive; "An" and "an" would be two accounts.
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(_("This username is already taken."))
        return value

    def validate(self, attrs: dict) -> dict:
        candidate = User(**{k: v for k, v in attrs.items() if k != "password"})
        try:
            password_validation.validate_password(attrs["password"], candidate)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": list(error.messages)}) from error
        return attrs

    def create(self, validated_data: dict) -> User:
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, role=Role.STUDENT, **validated_data)

    def to_representation(self, instance: User) -> dict:
        return UserSerializer(instance).data


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """What a user may change about themselves. Username and role stay fixed; school and
    class can be corrected but not cleared, mirroring sign-up."""

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "phone", "school_name", "class_name"]

    def validate(self, attrs: dict) -> dict:
        user = self.instance
        for field in ("school_name", "class_name"):
            if field in attrs:
                attrs[field] = attrs[field].strip()
            if user is not None and user.is_student and not attrs.get(field, getattr(user, field)):
                raise serializers.ValidationError({field: _("This field may not be blank.")})
        return attrs

    def to_representation(self, instance: User) -> dict:
        return UserSerializer(instance).data


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_current_password(self, value: str) -> str:
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError(_("Your current password is incorrect."))
        return value

    def validate_new_password(self, value: str) -> str:
        try:
            password_validation.validate_password(value, self.context["request"].user)
        except DjangoValidationError as error:
            raise serializers.ValidationError(list(error.messages)) from error
        return value

    def save(self) -> User:
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
